import { Injectable } from '@nestjs/common';
import type { RakazAdminRoute, RakazAdminRouteInput } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const routeInclude = {
  stops: { include: { student: true }, orderBy: { sequence: 'asc' } },
} satisfies Prisma.RouteInclude;
type RouteRow = Prisma.RouteGetPayload<{ include: typeof routeInclude }>;

function toWire(r: RouteRow): RakazAdminRoute {
  return {
    id: r.code,
    name: r.name,
    schoolId: r.schoolId,
    driverUid: r.driverId,
    depot: r.depotLat !== null && r.depotLng !== null ? { latitude: r.depotLat, longitude: r.depotLng } : null,
    stops: r.stops.map((s) => ({
      studentId: s.student.code,
      sequence: s.sequence,
      pickupTime: s.pickupTime,
      dropoffTime: s.dropoffTime,
    })),
    active: r.active,
  };
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(): Promise<RakazAdminRoute[]> {
    const rows = await this.prisma.route.findMany({
      where: { deletedAt: null },
      include: routeInclude,
      orderBy: { code: 'asc' },
    });
    return rows.map(toWire);
  }

  /** Creates the route when the code is new, updates it otherwise. */
  async save(input: RakazAdminRouteInput): Promise<RakazAdminRoute> {
    const school = await this.prisma.school.findFirst({ where: { id: input.schoolId, deletedAt: null } });
    if (!school) {
      throw ApiError.badRequest('المدرسة غير موجودة', [{ field: 'schoolId', message: 'المدرسة غير موجودة' }]);
    }
    const existing = await this.prisma.route.findUnique({ where: { code: input.id } });
    if (existing?.deletedAt) throw ApiError.conflict('رمز المسار مستخدم لمسار محذوف. اختر رمزاً آخر.');

    const data = {
      name: input.name,
      schoolId: input.schoolId,
      depotLat: input.depot?.latitude ?? null,
      depotLng: input.depot?.longitude ?? null,
      active: input.active,
    };
    const saved = existing
      ? await this.prisma.route.update({ where: { id: existing.id }, data, include: routeInclude })
      : await this.prisma.route.create({ data: { ...data, code: input.id }, include: routeInclude });
    return toWire(saved);
  }

  async remove(code: string): Promise<void> {
    const route = await this.prisma.route.findFirst({ where: { code, deletedAt: null } });
    if (!route) throw ApiError.notFound('المسار غير موجود');
    await this.prisma.$transaction([
      this.prisma.routeStop.deleteMany({ where: { routeId: route.id } }),
      this.prisma.student.updateMany({ where: { routeId: route.id }, data: { routeId: null } }),
      this.prisma.route.update({
        where: { id: route.id },
        data: { deletedAt: new Date(), active: false, driverId: null },
      }),
    ]);
  }

  /** A driver serves one route at a time, so assigning here releases any other route they had. */
  async assignDriver(code: string, driverUid: string | null): Promise<void> {
    const route = await this.prisma.route.findFirst({ where: { code, deletedAt: null } });
    if (!route) throw ApiError.notFound('المسار غير موجود');

    if (driverUid === null) {
      await this.prisma.route.update({ where: { id: route.id }, data: { driverId: null } });
      return;
    }
    const driver = await this.prisma.user.findFirst({ where: { id: driverUid, role: 'DRIVER', deletedAt: null } });
    if (!driver) throw ApiError.notFound('السائق غير موجود');
    if (route.driverId === driver.id) return;

    await this.prisma.$transaction([
      this.prisma.route.updateMany({ where: { driverId: driver.id }, data: { driverId: null } }),
      this.prisma.route.update({ where: { id: route.id }, data: { driverId: driver.id } }),
    ]);
    await this.notifications.notifyUsers([driver.id], {
      kind: 'ROUTE_CHANGE',
      title: 'تم إسناد مسار',
      body: `أسندت الإدارة لك المسار «${route.name}» (${route.code}).`,
    });
  }
}
