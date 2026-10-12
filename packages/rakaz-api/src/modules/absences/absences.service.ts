import { Injectable } from '@nestjs/common';
import type { RakazAbsenceInput, RakazAbsenceReport } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import { absenceReasonMap, absenceScopeMap } from '../../common/mappers.js';
import { dbDateFromISO, isoFromDbDate, ms, startOfDayMs } from '../../common/time.js';
import { AppConfig } from '../../config/app-config.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TripsService } from '../trips/trips.service.js';

const absenceInclude = { student: { include: { route: true } } } satisfies Prisma.AbsenceInclude;
type AbsenceRow = Prisma.AbsenceGetPayload<{ include: typeof absenceInclude }>;

const SCOPE_TEXT: Record<RakazAbsenceInput['scope'], string> = {
  fullDay: 'اليوم كاملاً',
  morningOnly: 'رحلة الصباح فقط',
  returnOnly: 'رحلة العودة فقط',
};

const HISTORY_DAYS = 60;

@Injectable()
export class AbsencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly trips: TripsService,
    private readonly notifications: NotificationsService,
  ) {}

  private toWire(a: AbsenceRow): RakazAbsenceReport {
    return {
      id: a.id,
      studentId: a.student.code,
      studentName: a.student.fullName,
      day: startOfDayMs(isoFromDbDate(a.day), this.config.timezone),
      scope: absenceScopeMap.toWire(a.scope),
      reason: absenceReasonMap.toWire(a.reason),
      note: a.note,
      createdAt: a.createdAt.getTime(),
      guardianUid: a.guardianId,
      seenByDriverAt: ms(a.seenByDriverAt),
    };
  }

  /** One report per student per day: reporting again for the same day replaces the earlier one. */
  async report(guardian: AuthUser, input: RakazAbsenceInput): Promise<RakazAbsenceReport> {
    const student = await this.prisma.student.findFirst({
      where: { code: input.studentId, guardianId: guardian.id, deletedAt: null },
      include: { route: true },
    });
    if (!student) throw ApiError.forbidden('هذا الطالب غير مرتبط بحسابك');
    if (input.dateISO < this.trips.todayISO()) {
      throw ApiError.badRequest('لا يمكن تسجيل غياب ليوم مضى', [{ field: 'dateISO', message: 'اختر اليوم أو يوماً قادماً' }]);
    }

    const day = dbDateFromISO(input.dateISO);
    const scope = absenceScopeMap.toDb(input.scope);
    const previous = await this.prisma.absence.findUnique({ where: { studentId_day: { studentId: student.id, day } } });
    const data = {
      scope,
      reason: absenceReasonMap.toDb(input.reason),
      note: input.note,
      guardianId: guardian.id,
      seenByDriverAt: null,
      deletedAt: null,
    };
    const saved = await this.prisma.absence.upsert({
      where: { studentId_day: { studentId: student.id, day } },
      create: { studentId: student.id, day, ...data },
      update: data,
      include: absenceInclude,
    });

    if (previous && !previous.deletedAt && previous.scope !== scope) {
      await this.trips.syncAbsence(student.id, input.dateISO, previous.scope, false);
    }
    await this.trips.syncAbsence(student.id, input.dateISO, scope, true);

    await this.notifications.notifyUsers([student.route?.driverId], {
      kind: 'ADMIN',
      title: 'بلاغ غياب',
      body: `${student.fullName} غائب بتاريخ ${input.dateISO} (${SCOPE_TEXT[input.scope]}).`,
      studentCode: student.code,
    });
    return this.toWire(saved);
  }

  async cancel(guardian: AuthUser, id: string): Promise<void> {
    const absence = await this.prisma.absence.findFirst({
      where: { id, deletedAt: null, student: { guardianId: guardian.id } },
      include: absenceInclude,
    });
    if (!absence) throw ApiError.notFound('بلاغ الغياب غير موجود');
    const dateISO = isoFromDbDate(absence.day);
    if (dateISO < this.trips.todayISO()) throw ApiError.conflict('لا يمكن إلغاء بلاغ غياب ليوم مضى');

    await this.prisma.absence.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.trips.syncAbsence(absence.studentId, dateISO, absence.scope, false);
    await this.notifications.notifyUsers([absence.student.route?.driverId], {
      kind: 'ADMIN',
      title: 'إلغاء بلاغ غياب',
      body: `أُلغي بلاغ غياب ${absence.student.fullName} بتاريخ ${dateISO}.`,
      studentCode: absence.student.code,
    });
  }

  /** Recent and upcoming absences of the guardian's children, newest day first. */
  async listForGuardian(guardianId: string): Promise<RakazAbsenceReport[]> {
    const since = new Date(dbDateFromISO(this.trips.todayISO()).getTime() - HISTORY_DAYS * 86_400_000);
    const rows = await this.prisma.absence.findMany({
      where: { deletedAt: null, day: { gte: since }, student: { guardianId, deletedAt: null } },
      include: absenceInclude,
      orderBy: { day: 'desc' },
    });
    return rows.map((r) => this.toWire(r));
  }

  /** Today's absences on the driver's own route; fetching them marks them as seen. */
  async listTodayForDriver(driverId: string): Promise<RakazAbsenceReport[]> {
    const day = dbDateFromISO(this.trips.todayISO());
    const where = { day, deletedAt: null, student: { deletedAt: null, route: { driverId, deletedAt: null } } };
    const rows = await this.prisma.absence.findMany({ where, include: absenceInclude });
    const unseen = rows.filter((r) => !r.seenByDriverAt).map((r) => r.id);
    if (unseen.length > 0) {
      await this.prisma.absence.updateMany({ where: { id: { in: unseen } }, data: { seenByDriverAt: new Date() } });
    }
    return rows.map((r) => this.toWire(r));
  }

  async listForAdmin(dateISO = this.trips.todayISO()): Promise<RakazAbsenceReport[]> {
    const rows = await this.prisma.absence.findMany({
      where: { day: dbDateFromISO(dateISO), deletedAt: null, student: { deletedAt: null } },
      include: absenceInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toWire(r));
  }

  countToday(): Promise<number> {
    return this.prisma.absence.count({
      where: { day: dbDateFromISO(this.trips.todayISO()), deletedAt: null, student: { deletedAt: null } },
    });
  }
}
