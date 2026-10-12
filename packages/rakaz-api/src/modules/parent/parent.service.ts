import { Injectable } from '@nestjs/common';
import type { RakazParentBootstrap, RakazParentStudent, RakazStudentAddress } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AbsencesService } from '../absences/absences.service.js';
import { toAuthUser } from '../auth/auth.service.js';
import { FinanceService } from '../finance/finance.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class ParentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly finance: FinanceService,
    private readonly absences: AbsencesService,
    private readonly notifications: NotificationsService,
  ) {}

  async bootstrap(guardianId: string): Promise<RakazParentBootstrap> {
    const [user, rows, support, absences] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: guardianId } }),
      this.prisma.student.findMany({
        where: { guardianId, deletedAt: null, active: true },
        include: {
          school: true,
          stop: true,
          route: { include: { driver: { include: { driverProfile: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.settings.get(),
      this.absences.listForGuardian(guardianId),
    ]);
    const finance = await this.finance.forStudents(rows);

    const students: RakazParentStudent[] = rows.map((s) => {
      const route = s.route && !s.route.deletedAt ? s.route : null;
      const driver = route?.driver && !route.driver.deletedAt ? route.driver : null;
      return {
        id: s.code,
        internalNumber: s.internalNumber,
        fullName: s.fullName,
        firstName: s.firstName,
        grade: s.grade,
        stage: s.stage,
        gender: s.gender === 'MALE' ? 'male' : s.gender === 'FEMALE' ? 'female' : null,
        birthDate: s.birthDate ? s.birthDate.getTime() : null,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        address: {
          governorate: s.governorate,
          area: s.area,
          neighborhood: s.neighborhood,
          street: s.street,
          landmark: s.landmark,
          accessNotes: s.accessNotes,
          latitude: s.homeLat,
          longitude: s.homeLng,
        },
        school: {
          id: s.school.id,
          name: s.school.name,
          address: s.school.address,
          locationLabel: s.school.locationLabel,
          latitude: s.school.lat,
          longitude: s.school.lng,
          phone: s.school.phone,
          startTime: s.school.startTime,
          endTime: s.school.endTime,
        },
        driver: driver
          ? {
              name: driver.name,
              phone: driver.phone,
              joinedAt: (driver.driverProfile?.hiredAt ?? driver.createdAt).getTime(),
              vehicle: {
                busNumber: driver.driverProfile?.vehicleLabel ?? '',
                plateNumber: driver.driverProfile?.plateNumber ?? '',
                model: driver.driverProfile?.vehicleModel ?? '',
                color: driver.driverProfile?.vehicleColor ?? '',
                capacity: driver.driverProfile?.vehicleCapacity ?? null,
              },
            }
          : null,
        route: route ? { id: route.code, name: route.name } : null,
        stop: s.stop ? { sequence: s.stop.sequence, pickupTime: s.stop.pickupTime, dropoffTime: s.stop.dropoffTime } : null,
        subscription: finance.get(s.id)?.subscription ?? null,
        payments: finance.get(s.id)?.payments ?? [],
      };
    });

    return { account: toAuthUser(user), students, absences, support, serverTime: Date.now() };
  }

  async updateAddress(guardian: AuthUser, studentCode: string, address: RakazStudentAddress): Promise<RakazStudentAddress> {
    const student = await this.prisma.student.findFirst({
      where: { code: studentCode, guardianId: guardian.id, deletedAt: null },
      include: { route: true },
    });
    if (!student) throw ApiError.forbidden('هذا الطالب غير مرتبط بحسابك');

    await this.prisma.student.update({
      where: { id: student.id },
      data: {
        governorate: address.governorate,
        area: address.area,
        neighborhood: address.neighborhood,
        street: address.street,
        landmark: address.landmark,
        accessNotes: address.accessNotes,
        homeLat: address.latitude,
        homeLng: address.longitude,
      },
    });

    const notice = {
      kind: 'ROUTE_CHANGE' as const,
      title: 'تحديث عنوان طالب',
      body: `حدّث ولي الأمر عنوان ${student.fullName}: ${[address.area, address.street].filter(Boolean).join('، ') || 'موقع جديد على الخريطة'}.`,
      studentCode: student.code,
    };
    await this.notifications.notifyUsers([student.route?.driverId], notice);
    await this.notifications.notifyAdmins(notice);
    return address;
  }
}
