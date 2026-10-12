import { Injectable } from '@nestjs/common';
import type { RakazAdminDriver, RakazAdminDriverInput, RakazAdminDriverResult } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AccountsService } from '../auth/accounts.service.js';

const driverInclude = { driverProfile: true, route: true } satisfies Prisma.UserInclude;
type DriverRow = Prisma.UserGetPayload<{ include: typeof driverInclude }>;

function toWire(u: DriverRow): RakazAdminDriver {
  return {
    uid: u.id,
    name: u.name,
    phone: u.phone,
    vehicleLabel: u.driverProfile?.vehicleLabel ?? '',
    plateNumber: u.driverProfile?.plateNumber ?? '',
    vehicleModel: u.driverProfile?.vehicleModel ?? '',
    vehicleColor: u.driverProfile?.vehicleColor ?? '',
    vehicleCapacity: u.driverProfile?.vehicleCapacity ?? null,
    routeId: u.route && !u.route.deletedAt ? u.route.code : null,
    active: u.active,
  };
}

const profileData = (input: RakazAdminDriverInput) => ({
  vehicleLabel: input.vehicleLabel,
  plateNumber: input.plateNumber,
  vehicleModel: input.vehicleModel,
  vehicleColor: input.vehicleColor,
  vehicleCapacity: input.vehicleCapacity,
});

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async list(): Promise<RakazAdminDriver[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: 'DRIVER', deletedAt: null },
      include: driverInclude,
      orderBy: { name: 'asc' },
    });
    return rows.map(toWire);
  }

  async create(input: RakazAdminDriverInput): Promise<RakazAdminDriverResult> {
    return this.prisma.$transaction(async (tx) => {
      const { user, credentials } = await this.accounts.create(
        { phone: input.phone, name: input.name, role: 'DRIVER' },
        tx,
      );
      const driver = await tx.user.update({
        where: { id: user.id },
        data: { active: input.active, driverProfile: { create: { ...profileData(input), hiredAt: new Date() } } },
        include: driverInclude,
      });
      return { driver: toWire(driver), credentials };
    });
  }

  async update(uid: string, input: RakazAdminDriverInput): Promise<RakazAdminDriverResult> {
    const existing = await this.prisma.user.findFirst({ where: { id: uid, role: 'DRIVER', deletedAt: null } });
    if (!existing) throw ApiError.notFound('السائق غير موجود');
    if (input.phone !== existing.phone) {
      const taken = await this.prisma.user.findUnique({ where: { phone: input.phone } });
      if (taken) throw ApiError.conflict('رقم الهاتف مسجّل لحساب آخر');
    }

    const driver = await this.prisma.user.update({
      where: { id: uid },
      data: {
        name: input.name,
        phone: input.phone,
        active: input.active,
        driverProfile: { upsert: { create: profileData(input), update: profileData(input) } },
      },
      include: driverInclude,
    });
    if (!input.active) {
      await this.prisma.refreshToken.updateMany({ where: { userId: uid, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return { driver: toWire(driver), credentials: null };
  }

  async remove(uid: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({ where: { id: uid, role: 'DRIVER', deletedAt: null } });
    if (!existing) throw ApiError.notFound('السائق غير موجود');
    await this.prisma.$transaction([
      this.prisma.route.updateMany({ where: { driverId: uid }, data: { driverId: null } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: uid } }),
      this.prisma.deviceToken.deleteMany({ where: { userId: uid } }),
      this.prisma.user.update({
        where: { id: uid },
        // Frees the phone number so it can be registered again.
        data: { deletedAt: new Date(), active: false, phone: `deleted:${uid}` },
      }),
    ]);
  }
}
