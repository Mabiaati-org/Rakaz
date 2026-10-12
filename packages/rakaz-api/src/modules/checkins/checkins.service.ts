import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  isWithinWorkSchedule,
  RAKAZ_CHECKIN_INTERVAL_SECONDS,
  type RakazAdminCheckin,
  type RakazCheckinInput,
  type RakazDriverCheckin,
} from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import { dateISOInTz, dbDateFromISO, localClock, startOfDayMs } from '../../common/time.js';
import { AppConfig } from '../../config/app-config.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { GeocoderService } from './geocoder.service.js';

const checkinInclude = {
  passengers: { include: { student: true } },
} satisfies Prisma.DriverCheckinInclude;
type CheckinRow = Prisma.DriverCheckinGetPayload<{ include: typeof checkinInclude }>;

const RETENTION_DAYS = 90;
const DAY_MS = 86_400_000;

function toWire(row: CheckinRow): RakazDriverCheckin {
  return {
    id: row.id,
    latitude: row.lat,
    longitude: row.lng,
    accuracy: row.accuracy,
    address: row.address,
    at: row.at.getTime(),
    passengers: row.passengers
      .map((p) => ({ studentId: p.student.code, name: p.student.fullName }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    nextCheckinAt: row.at.getTime() + RAKAZ_CHECKIN_INTERVAL_SECONDS * 1000,
  };
}

@Injectable()
export class CheckinsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckinsService.name);
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly settings: SettingsService,
    private readonly geocoder: GeocoderService,
  ) {}

  onModuleInit(): void {
    if (this.config.env === 'test') return;
    void this.prune();
    this.pruneTimer = setInterval(() => void this.prune(), DAY_MS);
    this.pruneTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.pruneTimer) clearInterval(this.pruneTimer);
  }

  private async prune(): Promise<void> {
    try {
      const { count } = await this.prisma.driverCheckin.deleteMany({
        where: { at: { lt: new Date(Date.now() - RETENTION_DAYS * DAY_MS) } },
      });
      if (count > 0) this.logger.log(`Removed ${count} check-ins older than ${RETENTION_DAYS} days`);
    } catch (error) {
      this.logger.warn(`Pruning check-ins failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Students on the driver's bus right now, according to today's running trips. */
  private async onBoard(driverId: string): Promise<{ routeId: string | null; studentIds: string[] }> {
    const route = await this.prisma.route.findFirst({ where: { driverId, deletedAt: null }, select: { id: true } });
    if (!route) return { routeId: null, studentIds: [] };

    const today = dbDateFromISO(dateISOInTz(Date.now(), this.config.timezone));
    const trips = await this.prisma.trip.findMany({
      where: { routeId: route.id, date: today, phase: 'IN_PROGRESS' },
      include: { students: true },
    });
    const studentIds = new Set<string>();
    for (const trip of trips) {
      for (const s of trip.students) {
        // Morning: on the bus once picked up. Afternoon: on the bus until dropped off.
        const riding = trip.kind === 'MORNING' ? s.status === 'PICKED_UP' : s.status === 'PENDING' || s.status === 'ARRIVED';
        if (riding) studentIds.add(s.studentId);
      }
    }
    return { routeId: route.id, studentIds: [...studentIds] };
  }

  /**
   * Records where the driver is and who is with them. Rejected with 422 outside duty hours,
   * which are judged by the server's clock rather than the phone's.
   */
  async record(driver: AuthUser, input: RakazCheckinInput): Promise<RakazDriverCheckin> {
    const now = new Date();
    const { weekday, minutesOfDay } = localClock(now, this.config.timezone);
    const schedule = await this.settings.getWorkSchedule();
    if (!isWithinWorkSchedule(schedule, weekday, minutesOfDay)) {
      throw ApiError.unprocessable(
        `خارج وقت الدوام (${schedule.startTime} – ${schedule.endTime}). لا يُسجَّل الموقع الآن.`,
        'OUTSIDE_WORKING_HOURS',
      );
    }

    const [{ routeId, studentIds }, address] = await Promise.all([
      this.onBoard(driver.id),
      this.geocoder.reverse(input.latitude, input.longitude),
    ]);
    const row = await this.prisma.driverCheckin.create({
      data: {
        driverId: driver.id,
        routeId,
        lat: input.latitude,
        lng: input.longitude,
        accuracy: input.accuracy,
        address,
        at: now,
        passengers: { create: studentIds.map((studentId) => ({ studentId })) },
      },
      include: checkinInclude,
    });
    return toWire(row);
  }

  async listForAdmin(params: { dateISO?: string; driverUid?: string }): Promise<RakazAdminCheckin[]> {
    const dateISO = params.dateISO ?? dateISOInTz(Date.now(), this.config.timezone);
    const start = startOfDayMs(dateISO, this.config.timezone);
    const rows = await this.prisma.driverCheckin.findMany({
      where: {
        at: { gte: new Date(start), lt: new Date(start + DAY_MS) },
        ...(params.driverUid ? { driverId: params.driverUid } : {}),
      },
      include: { ...checkinInclude, driver: { include: { driverProfile: true, route: true } } },
      orderBy: { at: 'desc' },
      take: 2000,
    });
    return rows.map((row) => ({
      ...toWire(row),
      driverUid: row.driverId,
      driverName: row.driver.name,
      vehicleLabel: row.driver.driverProfile?.vehicleLabel ?? '',
      routeId: row.driver.route && !row.driver.route.deletedAt ? row.driver.route.code : null,
    }));
  }
}
