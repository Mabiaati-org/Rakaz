import { Injectable } from '@nestjs/common';
import type { RakazAdminStudent, RakazAdminStudentInput, RakazAdminStudentResult } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import { dbDateFromISO } from '../../common/time.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AccountsService } from '../auth/accounts.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const studentInclude = { school: true, route: true } satisfies Prisma.StudentInclude;
type StudentRow = Prisma.StudentGetPayload<{ include: typeof studentInclude }>;

const FIRST_STUDENT_NUMBER = 10001;

export function studentToWire(s: StudentRow): RakazAdminStudent {
  return {
    id: s.code,
    internalNumber: s.internalNumber,
    fullName: s.fullName,
    firstName: s.firstName,
    grade: s.grade,
    stage: s.stage,
    gender: s.gender === 'MALE' ? 'male' : s.gender === 'FEMALE' ? 'female' : null,
    birthDate: s.birthDate ? s.birthDate.getTime() : null,
    schoolId: s.schoolId,
    schoolName: s.school.name,
    routeId: s.route?.code ?? null,
    guardianUid: s.guardianId,
    guardianName: s.guardianName,
    guardianPhone: s.guardianPhone,
    home: { latitude: s.homeLat, longitude: s.homeLng },
    governorate: s.governorate,
    area: s.area,
    neighborhood: s.neighborhood,
    street: s.street,
    landmark: s.landmark,
    accessNotes: s.accessNotes,
    notes: s.notes,
    active: s.active,
  };
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(): Promise<RakazAdminStudent[]> {
    const rows = await this.prisma.student.findMany({
      where: { deletedAt: null },
      include: studentInclude,
      orderBy: { code: 'asc' },
    });
    return rows.map(studentToWire);
  }

  /** Creates the student when the code is new, updates it otherwise. */
  async save(input: RakazAdminStudentInput): Promise<RakazAdminStudentResult> {
    const school = await this.prisma.school.findFirst({ where: { id: input.schoolId, deletedAt: null } });
    if (!school) {
      throw ApiError.badRequest('المدرسة غير موجودة', [{ field: 'schoolId', message: 'المدرسة غير موجودة' }]);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = input.id ? await tx.student.findUnique({ where: { code: input.id } }) : null;
      if (existing?.deletedAt) throw ApiError.conflict('رمز الطالب مستخدم لطالب محذوف. اختر رمزاً آخر.');

      const guardian = await this.accounts.ensureGuardian(input.guardianPhone, input.guardianName, tx);
      const data = {
        internalNumber: input.internalNumber,
        fullName: input.fullName,
        firstName: input.firstName,
        grade: input.grade,
        stage: input.stage,
        gender: input.gender === 'male' ? ('MALE' as const) : input.gender === 'female' ? ('FEMALE' as const) : null,
        birthDate: input.birthDate === null ? null : dbDateFromISO(new Date(input.birthDate).toISOString().slice(0, 10)),
        schoolId: input.schoolId,
        guardianId: guardian.user.id,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        homeLat: input.home.latitude,
        homeLng: input.home.longitude,
        governorate: input.governorate,
        area: input.area,
        neighborhood: input.neighborhood,
        street: input.street,
        landmark: input.landmark,
        accessNotes: input.accessNotes,
        notes: input.notes,
        active: input.active,
      };

      const saved = existing
        ? await tx.student.update({ where: { id: existing.id }, data, include: studentInclude })
        : await tx.student.create({
            data: { ...data, code: input.id ?? (await this.nextCode(tx)) },
            include: studentInclude,
          });
      return { student: studentToWire(saved), guardianCredentials: guardian.credentials };
    });
  }

  async remove(code: string): Promise<void> {
    const student = await this.prisma.student.findFirst({ where: { code, deletedAt: null } });
    if (!student) throw ApiError.notFound('الطالب غير موجود');
    await this.prisma.$transaction([
      this.prisma.routeStop.deleteMany({ where: { studentId: student.id } }),
      this.prisma.student.update({
        where: { id: student.id },
        data: { deletedAt: new Date(), active: false, routeId: null },
      }),
    ]);
  }

  /** Puts the student on a route (as a stop) or takes them off their route when `routeCode` is null. */
  async assignRoute(
    code: string,
    routeCode: string | null,
    stop: { sequence?: number; pickupTime?: string; dropoffTime?: string } = {},
  ): Promise<void> {
    const student = await this.prisma.student.findFirst({ where: { code, deletedAt: null }, include: { stop: true } });
    if (!student) throw ApiError.notFound('الطالب غير موجود');

    if (routeCode === null) {
      await this.prisma.$transaction([
        this.prisma.routeStop.deleteMany({ where: { studentId: student.id } }),
        this.prisma.student.update({ where: { id: student.id }, data: { routeId: null } }),
      ]);
      return;
    }

    const route = await this.prisma.route.findFirst({ where: { code: routeCode, deletedAt: null } });
    if (!route) throw ApiError.notFound('المسار غير موجود');

    const sameRoute = student.stop?.routeId === route.id;
    const last = await this.prisma.routeStop.aggregate({ where: { routeId: route.id }, _max: { sequence: true } });
    const sequence = stop.sequence ?? (sameRoute ? student.stop!.sequence : (last._max.sequence ?? 0) + 1);

    await this.prisma.$transaction([
      this.prisma.student.update({ where: { id: student.id }, data: { routeId: route.id } }),
      this.prisma.routeStop.upsert({
        where: { studentId: student.id },
        create: {
          routeId: route.id,
          studentId: student.id,
          sequence,
          ...(stop.pickupTime ? { pickupTime: stop.pickupTime } : {}),
          ...(stop.dropoffTime ? { dropoffTime: stop.dropoffTime } : {}),
        },
        update: {
          routeId: route.id,
          sequence,
          ...(stop.pickupTime ? { pickupTime: stop.pickupTime } : {}),
          ...(stop.dropoffTime ? { dropoffTime: stop.dropoffTime } : {}),
        },
      }),
    ]);

    if (!sameRoute) {
      await this.notifications.notifyUsers([route.driverId], {
        kind: 'ROUTE_CHANGE',
        title: 'تحديث على المسار',
        body: `أُضيف الطالب ${student.fullName} إلى مسارك.`,
        studentCode: student.code,
      });
    }
  }

  private async nextCode(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.student.findMany({ where: { code: { startsWith: 'STU-' } }, select: { code: true } });
    const highest = rows.reduce((max, r) => {
      const n = Number(r.code.slice(4));
      return Number.isInteger(n) && n > max ? n : max;
    }, FIRST_STUDENT_NUMBER - 1);
    return `STU-${highest + 1}`;
  }
}
