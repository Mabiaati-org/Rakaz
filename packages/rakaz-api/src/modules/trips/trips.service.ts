import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  buildTripId,
  notificationForAction,
  parentStatusFor,
  ParentTripStatus,
  type ParentTripStatusValue,
  type RakazAdminTrip,
  type RakazDriverEventInput,
  type RakazDriverTripState,
  type RakazHandoverResult,
  type RakazLocationPing,
  type RakazParentTripView,
  type RakazTripEvent,
  type RakazTripKind,
  type RakazTripSnapshot,
  tripStatusForPhase,
} from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import { notificationKindMap, stopStatusMap, tripKindMap, tripPhaseMap } from '../../common/mappers.js';
import { dateISOInTz, dbDateFromISO, isoFromDbDate, ms, startOfDayMs } from '../../common/time.js';
import { AppConfig } from '../../config/app-config.service.js';
import { Prisma, type StopStatus, type TripKind } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { type NotificationInput, NotificationsService } from '../notifications/notifications.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { tripNotificationText } from './trip-texts.js';

type Tx = Prisma.TransactionClient;

const adminTripInclude = {
  route: { include: { driver: true, stops: true } },
  students: { include: { student: true } },
} satisfies Prisma.TripInclude;

type AdminTripRow = Prisma.TripGetPayload<{ include: typeof adminTripInclude }>;
type DriverRoute = Prisma.RouteGetPayload<{ include: { driver: { include: { driverProfile: true } } } }>;

type StudentRef = { guardianId: string | null; firstName: string; code: string };

interface StudentPatch {
  status: StopStatus;
  arrivedAt?: Date;
  completedAt?: Date;
  note?: string;
  handoverPending?: boolean;
}

/** A notification to send once the transaction that produced it has committed. */
interface Outbox {
  userIds: Array<string | null>;
  input: NotificationInput;
  admins?: boolean;
}

// A device clock far in the future would file the event under the wrong day.
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

// Bus positions are only useful for following a trip and reviewing a recent incident.
const PING_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

@Injectable()
export class TripsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TripsService.name);
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  onModuleInit(): void {
    if (this.config.env === 'test') return;
    void this.pruneOldPings();
    this.pruneTimer = setInterval(() => void this.pruneOldPings(), DAY_MS);
    this.pruneTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.pruneTimer) clearInterval(this.pruneTimer);
  }

  private async pruneOldPings(): Promise<void> {
    try {
      const { count } = await this.prisma.locationPing.deleteMany({
        where: { at: { lt: new Date(Date.now() - PING_RETENTION_DAYS * DAY_MS) } },
      });
      if (count > 0) this.logger.log(`Removed ${count} bus positions older than ${PING_RETENTION_DAYS} days`);
    } catch (error) {
      this.logger.warn(`Pruning bus positions failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  todayISO(): string {
    return dateISOInTz(Date.now(), this.config.timezone);
  }

  // ---------------------------------------------------------------- trip rows

  /** Finds the daily trip of a route, creating it (with one row per stop) when missing. */
  async ensureTrip(
    db: Tx,
    route: { id: string; code: string; driverId: string | null },
    dateISO: string,
    kind: TripKind,
    vehicleLabel: string | null,
  ): Promise<{ id: string; code: string }> {
    const date = dbDateFromISO(dateISO);
    const where = { routeId_date_kind: { routeId: route.id, date, kind } };
    const existing = await db.trip.findUnique({ where, select: { id: true, code: true } });
    if (existing) return existing;

    const [stops, absences] = await Promise.all([
      db.routeStop.findMany({ where: { routeId: route.id } }),
      db.absence.findMany({ where: { day: date, deletedAt: null, student: { routeId: route.id } } }),
    ]);
    const absentIds = new Set(
      absences
        .filter((a) => a.scope === 'FULL_DAY' || (a.scope === 'MORNING_ONLY') === (kind === 'MORNING'))
        .map((a) => a.studentId),
    );

    try {
      return await db.trip.create({
        data: {
          code: buildTripId({ dateISO, routeId: route.code, tripKind: tripKindMap.toWire(kind) }),
          routeId: route.id,
          kind,
          date,
          driverId: route.driverId,
          vehicleLabel,
          students: {
            create: stops.map((stop) => ({
              studentId: stop.studentId,
              status: absentIds.has(stop.studentId) ? ('ABSENT' as const) : ('PENDING' as const),
              note: absentIds.has(stop.studentId) ? 'بلاغ غياب من ولي الأمر' : '',
            })),
          },
        },
        select: { id: true, code: true },
      });
    } catch (error) {
      // Two requests raced to create the same trip; the loser reads the winner's row.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return db.trip.findUniqueOrThrow({ where, select: { id: true, code: true } });
      }
      throw error;
    }
  }

  async openDaily(routeCode: string, dateISO = this.todayISO()): Promise<{ morningTripId: string; afternoonTripId: string }> {
    const route = await this.prisma.route.findFirst({
      where: { code: routeCode, deletedAt: null },
      include: { driver: { include: { driverProfile: true } } },
    });
    if (!route) throw ApiError.notFound('المسار غير موجود');
    const label = route.driver?.driverProfile?.vehicleLabel ?? null;

    const [morning, afternoon] = await this.prisma.$transaction(async (tx) => [
      await this.ensureTrip(tx, route, dateISO, 'MORNING', label),
      await this.ensureTrip(tx, route, dateISO, 'AFTERNOON', label),
    ]);
    this.realtime.tripsChanged();
    return { morningTripId: morning.code, afternoonTripId: afternoon.code };
  }

  // ---------------------------------------------------------------- mapping

  private progressOf(trip: AdminTripRow): number {
    if (trip.phase === 'NOT_STARTED') return 0;
    if (trip.phase === 'FINISHED' || trip.phase === 'AT_SCHOOL') return 1;
    const riders = trip.students.filter((s) => s.status !== 'ABSENT');
    if (riders.length === 0) return 0;
    const doneStatus = trip.kind === 'MORNING' ? 'PICKED_UP' : 'DROPPED_OFF';
    const done = riders.filter((s) => s.status === doneStatus).length;
    // The last leg (to school / back to the depot) is still ahead after the final stop.
    return Math.min(0.95, done / (riders.length + (trip.kind === 'MORNING' ? 1 : 0)));
  }

  private toSnapshot(trip: AdminTripRow): RakazTripSnapshot {
    return {
      tripId: trip.code,
      routeId: trip.route.code,
      tripKind: tripKindMap.toWire(trip.kind),
      status: tripStatusForPhase(tripPhaseMap.toWire(trip.phase)),
      progress: this.progressOf(trip),
      driverUid: trip.driverId,
      vehicleLabel: trip.vehicleLabel,
      updatedAt: trip.updatedAt.getTime(),
      handoverPending: trip.students.some((s) => s.handoverPending),
      handoverConfirmedAt: null,
      busLocation:
        trip.busLat !== null && trip.busLng !== null ? { latitude: trip.busLat, longitude: trip.busLng } : null,
      busUpdatedAt: ms(trip.busUpdatedAt),
      dateISO: isoFromDbDate(trip.date),
      startedAt: ms(trip.startedAt),
      endedAt: ms(trip.endedAt),
    };
  }

  private toAdminTrip(trip: AdminTripRow): RakazAdminTrip {
    const sequence = new Map(trip.route.stops.map((s) => [s.studentId, s.sequence]));
    const ordered = [...trip.students].sort(
      (a, b) => (sequence.get(a.studentId) ?? 999) - (sequence.get(b.studentId) ?? 999),
    );
    return {
      ...this.toSnapshot(trip),
      routeName: trip.route.name,
      driverName: trip.route.driver?.name ?? null,
      phase: tripPhaseMap.toWire(trip.phase),
      students: ordered.map((s) => ({
        studentId: s.student.code,
        studentName: s.student.fullName,
        status: stopStatusMap.toWire(s.status),
        arrivedAt: ms(s.arrivedAt),
        completedAt: ms(s.completedAt),
        handoverPending: s.handoverPending,
        handoverConfirmedAt: ms(s.handoverConfirmedAt),
        handoverIssue: s.handoverIssue,
      })),
    };
  }

  // ---------------------------------------------------------------- admin reads

  async listAdminTrips(dateISO = this.todayISO()): Promise<RakazAdminTrip[]> {
    const rows = await this.prisma.trip.findMany({
      where: { date: dbDateFromISO(dateISO) },
      include: adminTripInclude,
      orderBy: [{ route: { code: 'asc' } }, { kind: 'asc' }],
    });
    return rows.map((row) => this.toAdminTrip(row));
  }

  async listEvents(tripCode: string): Promise<RakazTripEvent[]> {
    const trip = await this.prisma.trip.findUnique({
      where: { code: tripCode },
      include: { route: true, events: { orderBy: { at: 'asc' } } },
    });
    if (!trip) throw ApiError.notFound('الرحلة غير موجودة');
    return trip.events.map((e) => ({
      id: e.id,
      tripId: trip.code,
      routeId: trip.route.code,
      tripKind: tripKindMap.toWire(trip.kind),
      action: e.action as RakazTripEvent['action'],
      studentId: e.studentCode,
      at: e.at.getTime(),
      location: e.lat !== null && e.lng !== null ? { latitude: e.lat, longitude: e.lng } : null,
      detail: e.detail,
      driverUid: e.driverId,
      schemaVersion: 1,
    }));
  }

  // ---------------------------------------------------------------- driver writes

  async driverRoute(driverId: string): Promise<DriverRoute> {
    const route = await this.prisma.route.findFirst({
      where: { driverId, deletedAt: null, active: true },
      include: { driver: { include: { driverProfile: true } } },
    });
    if (!route) throw ApiError.conflict('لم تُسند الإدارة مساراً لهذا الحساب بعد', 'NO_ROUTE_ASSIGNED');
    return route;
  }

  /** Applies a batch of driver actions in chronological order. Re-sent events are ignored. */
  async applyDriverEvents(
    driver: AuthUser,
    inputs: RakazDriverEventInput[],
  ): Promise<{ accepted: number; duplicates: number }> {
    const route = await this.driverRoute(driver.id);
    const ordered = [...inputs].sort((a, b) => a.at - b.at);
    const outbox: Outbox[] = [];
    let accepted = 0;

    for (const input of ordered) {
      const applied = await this.prisma.$transaction((tx) => this.applyOne(tx, route, driver, input, outbox));
      if (applied) accepted += 1;
    }

    for (const item of outbox) {
      if (item.admins) await this.notifications.notifyAdmins(item.input);
      await this.notifications.notifyUsers(item.userIds, item.input);
    }
    if (accepted > 0) this.realtime.tripsChanged();
    return { accepted, duplicates: ordered.length - accepted };
  }

  private async applyOne(
    tx: Tx,
    route: DriverRoute,
    driver: AuthUser,
    input: RakazDriverEventInput,
    outbox: Outbox[],
  ): Promise<boolean> {
    if (await tx.tripEvent.findUnique({ where: { id: input.id }, select: { id: true } })) return false;

    const at = new Date(Math.min(input.at, Date.now() + MAX_CLOCK_SKEW_MS));
    const dateISO = dateISOInTz(at, this.config.timezone);
    // START_RETURN always belongs to the afternoon trip, whatever the client believed.
    const kind: TripKind = input.action === 'START_RETURN' ? 'AFTERNOON' : tripKindMap.toDb(input.tripKind);
    const vehicleLabel = route.driver?.driverProfile?.vehicleLabel ?? null;
    const ref = await this.ensureTrip(tx, route, dateISO, kind, vehicleLabel);

    const student = input.studentId
      ? await tx.student.findFirst({ where: { code: input.studentId, routeId: route.id, deletedAt: null } })
      : null;
    if (input.studentId && !student) {
      // Stored for the audit trail, but it cannot change state: the student left this route.
      this.logger.warn(`Event ${input.id}: student ${input.studentId} is not on route ${route.code}`);
    }

    await tx.tripEvent.create({
      data: {
        id: input.id,
        tripId: ref.id,
        action: input.action,
        studentCode: input.studentId,
        at,
        lat: input.location?.latitude ?? null,
        lng: input.location?.longitude ?? null,
        detail: input.detail,
        driverId: driver.id,
        schemaVersion: input.schemaVersion,
      },
    });

    const trip = await tx.trip.findUniqueOrThrow({
      where: { id: ref.id },
      include: { students: { include: { student: true } } },
    });
    const riders = trip.students.filter((s) => s.status !== 'ABSENT');
    const notificationKind = notificationForAction(input.action, tripKindMap.toWire(kind));
    const dbNotificationKind = notificationKind ? notificationKindMap.toDb(notificationKind) : null;
    const notifyGuardians = (rows: Array<{ student: StudentRef }>): void => {
      if (!dbNotificationKind) return;
      for (const row of rows) {
        outbox.push({
          userIds: [row.student.guardianId],
          input: {
            kind: dbNotificationKind,
            ...tripNotificationText(dbNotificationKind, row.student.firstName, kind),
            studentCode: row.student.code,
            tripCode: trip.code,
          },
        });
      }
    };

    const tripPatch: Prisma.TripUpdateInput = {};
    if (input.location) {
      tripPatch.busLat = input.location.latitude;
      tripPatch.busLng = input.location.longitude;
      tripPatch.busUpdatedAt = at;
    }
    // Any action on a trip that never got an explicit start still means the bus is moving.
    const startIfNeeded = (): void => {
      if (trip.phase === 'NOT_STARTED') {
        tripPatch.phase = 'IN_PROGRESS';
        tripPatch.startedAt = at;
      }
    };
    const setStudent = (data: StudentPatch): Promise<unknown> =>
      student
        ? tx.tripStudent.upsert({
            where: { tripId_studentId: { tripId: trip.id, studentId: student.id } },
            create: { tripId: trip.id, studentId: student.id, ...data },
            update: data,
          })
        : Promise.resolve();
    const own = student ? [{ student }] : [];
    const ownStatus = student ? trip.students.find((s) => s.studentId === student.id)?.status : undefined;

    switch (input.action) {
      case 'START_TRIP':
        startIfNeeded();
        if (trip.phase === 'NOT_STARTED') notifyGuardians(riders);
        break;

      case 'START_RETURN': {
        startIfNeeded();
        const morning = await tx.trip.findUnique({
          where: { routeId_date_kind: { routeId: route.id, date: trip.date, kind: 'MORNING' } },
          include: { students: true },
        });
        if (morning && morning.phase !== 'NOT_STARTED') {
          if (morning.phase !== 'FINISHED') {
            await tx.trip.update({ where: { id: morning.id }, data: { phase: 'FINISHED', endedAt: at } });
          }
          // Only children who rode in the morning are on the bus home.
          const notOnBus = morning.students.filter((s) => s.status !== 'PICKED_UP').map((s) => s.studentId);
          await tx.tripStudent.updateMany({
            where: { tripId: trip.id, studentId: { in: notOnBus }, status: 'PENDING' },
            data: { status: 'ABSENT', note: 'لم يحضر في رحلة الصباح' },
          });
          if (trip.phase === 'NOT_STARTED') notifyGuardians(riders.filter((s) => !notOnBus.includes(s.studentId)));
        } else if (trip.phase === 'NOT_STARTED') {
          notifyGuardians(riders);
        }
        break;
      }

      case 'ARRIVED_AT_STOP':
        startIfNeeded();
        if (student && ownStatus !== 'PICKED_UP' && ownStatus !== 'DROPPED_OFF') {
          await setStudent({ status: 'ARRIVED', arrivedAt: at });
          notifyGuardians(own);
        }
        break;

      case 'PICKED_UP':
        startIfNeeded();
        await setStudent({ status: 'PICKED_UP', completedAt: at });
        notifyGuardians(own);
        break;

      case 'DROPPED_OFF':
        startIfNeeded();
        await setStudent({ status: 'DROPPED_OFF', completedAt: at, handoverPending: true });
        notifyGuardians(own);
        break;

      case 'MARKED_ABSENT':
        startIfNeeded();
        await setStudent({ status: 'ABSENT', completedAt: at, note: input.detail ?? '' });
        notifyGuardians(own);
        break;

      case 'ARRIVED_AT_SCHOOL':
        if (trip.phase !== 'FINISHED') {
          tripPatch.phase = 'AT_SCHOOL';
          tripPatch.arrivedSchoolAt = at;
          tripPatch.startedAt = trip.startedAt ?? at;
        }
        notifyGuardians(trip.students.filter((s) => s.status === 'PICKED_UP'));
        break;

      case 'END_TRIP':
        tripPatch.phase = 'FINISHED';
        tripPatch.endedAt = at;
        await tx.trip.updateMany({
          where: { routeId: route.id, date: trip.date, id: { not: trip.id }, phase: { in: ['IN_PROGRESS', 'AT_SCHOOL'] } },
          data: { phase: 'FINISHED', endedAt: at },
        });
        break;

      case 'EMERGENCY':
        notifyGuardians(riders);
        outbox.push({
          userIds: [],
          admins: true,
          input: {
            kind: 'EMERGENCY',
            title: `حالة طارئة — ${route.name}`,
            body: `${driver.name} (${vehicleLabel ?? route.code}): ${input.detail ?? 'بدون تفاصيل'}`,
            tripCode: trip.code,
          },
        });
        break;

      case 'REORDER_STOPS':
        await this.reorderStops(tx, route.id, input.detail);
        break;
    }

    if (Object.keys(tripPatch).length > 0) await tx.trip.update({ where: { id: trip.id }, data: tripPatch });
    return true;
  }

  /** `detail` carries the new order as comma-separated student codes. */
  private async reorderStops(tx: Tx, routeId: string, detail: string | null): Promise<void> {
    const codes = (detail ?? '').split(',').map((c) => c.trim()).filter(Boolean);
    if (codes.length < 2) return;
    const stops = await tx.routeStop.findMany({ where: { routeId }, include: { student: true } });
    const byCode = new Map(stops.map((s) => [s.student.code, s]));
    if (codes.length !== stops.length || !codes.every((c) => byCode.has(c))) return;
    await Promise.all(
      codes.map((code, index) => tx.routeStop.update({ where: { id: byCode.get(code)!.id }, data: { sequence: index + 1 } })),
    );
  }

  /** Stores bus positions and moves the live marker to the newest one. */
  async recordLocations(driver: AuthUser, pings: RakazLocationPing[]): Promise<{ stored: number }> {
    if (pings.length === 0) return { stored: 0 };
    const route = await this.driverRoute(driver.id);
    const vehicleLabel = route.driver?.driverProfile?.vehicleLabel ?? null;
    const now = Date.now();

    const byTrip = new Map<string, { dateISO: string; kind: TripKind; pings: RakazLocationPing[] }>();
    for (const ping of pings) {
      const at = Math.min(ping.at, now + MAX_CLOCK_SKEW_MS);
      const dateISO = dateISOInTz(at, this.config.timezone);
      const kind = tripKindMap.toDb(ping.tripKind);
      const key = `${dateISO}:${kind}`;
      const group = byTrip.get(key) ?? { dateISO, kind, pings: [] };
      group.pings.push({ ...ping, at });
      byTrip.set(key, group);
    }

    for (const group of byTrip.values()) {
      await this.prisma.$transaction(async (tx) => {
        const ref = await this.ensureTrip(tx, route, group.dateISO, group.kind, vehicleLabel);
        const trip = await tx.trip.findUniqueOrThrow({ where: { id: ref.id } });
        await tx.locationPing.createMany({
          data: group.pings.map((p) => ({
            tripId: trip.id,
            lat: p.latitude,
            lng: p.longitude,
            speed: p.speed,
            heading: p.heading,
            at: new Date(p.at),
          })),
        });
        const latest = group.pings.reduce((a, b) => (b.at > a.at ? b : a));
        if (!trip.busUpdatedAt || latest.at >= trip.busUpdatedAt.getTime()) {
          await tx.trip.update({
            where: { id: trip.id },
            data: { busLat: latest.latitude, busLng: latest.longitude, busUpdatedAt: new Date(latest.at) },
          });
        }
      });
    }
    this.realtime.tripsChanged();
    return { stored: pings.length };
  }

  /** Today's server-side trip state for the driver app to restore from. */
  async driverToday(routeId: string | null): Promise<{
    dateISO: string;
    morning: RakazDriverTripState | null;
    afternoon: RakazDriverTripState | null;
  }> {
    const dateISO = this.todayISO();
    if (!routeId) return { dateISO, morning: null, afternoon: null };
    const trips = await this.prisma.trip.findMany({
      where: { routeId, date: dbDateFromISO(dateISO) },
      include: { students: { include: { student: true } } },
    });
    const state = (kind: TripKind): RakazDriverTripState | null => {
      const trip = trips.find((t) => t.kind === kind);
      if (!trip) return null;
      return {
        tripKind: tripKindMap.toWire(kind),
        phase: tripPhaseMap.toWire(trip.phase),
        startedAt: ms(trip.startedAt),
        arrivedSchoolAt: ms(trip.arrivedSchoolAt),
        endedAt: ms(trip.endedAt),
        students: trip.students.map((s) => ({
          studentId: s.student.code,
          status: stopStatusMap.toWire(s.status),
          arrivedAt: ms(s.arrivedAt),
          completedAt: ms(s.completedAt),
        })),
      };
    };
    return { dateISO, morning: state('MORNING'), afternoon: state('AFTERNOON') };
  }

  // ---------------------------------------------------------------- guardian reads / writes

  /** Today's two trips as one guardian sees them for one of their children. */
  async parentToday(
    guardian: AuthUser,
    studentCode: string,
  ): Promise<{ morning: RakazParentTripView; afternoon: RakazParentTripView; activeKind: RakazTripKind }> {
    const student = await this.prisma.student.findFirst({
      where: { code: studentCode, guardianId: guardian.id, deletedAt: null },
      include: { route: { include: { stops: true } }, stop: true },
    });
    if (!student) throw ApiError.forbidden('هذا الطالب غير مرتبط بحسابك');

    const dateISO = this.todayISO();
    const trips = student.routeId
      ? await this.prisma.trip.findMany({
          where: { routeId: student.routeId, date: dbDateFromISO(dateISO) },
          include: adminTripInclude,
        })
      : [];

    const view = (kind: TripKind): RakazParentTripView => {
      const tripKind = tripKindMap.toWire(kind);
      const trip = trips.find((t) => t.kind === kind);
      const scheduledTime = student.stop ? (kind === 'MORNING' ? student.stop.pickupTime : student.stop.dropoffTime) : null;
      if (!trip) {
        return {
          tripId: buildTripId({ dateISO, routeId: student.route?.code ?? 'UNASSIGNED', tripKind }),
          routeId: student.route?.code ?? '',
          tripKind,
          status: ParentTripStatus.notStarted,
          progress: 0,
          driverUid: student.route?.driverId ?? null,
          vehicleLabel: null,
          updatedAt: Date.now(),
          handoverPending: false,
          handoverConfirmedAt: null,
          busLocation: null,
          busUpdatedAt: null,
          dateISO,
          startedAt: null,
          endedAt: null,
          studentId: student.code,
          studentStatus: 'pending',
          timeline: [],
          scheduledTime,
          stopsAhead: null,
        };
      }

      const own = trip.students.find((s) => s.studentId === student.id);
      const phase = tripPhaseMap.toWire(trip.phase);
      const stopStatus = own ? stopStatusMap.toWire(own.status) : 'pending';
      const status = parentStatusFor(tripKind, phase, stopStatus);

      const timeline: Array<{ status: ParentTripStatusValue; at: number }> = [];
      const push = (s: ParentTripStatusValue, at: Date | null | undefined): void => {
        if (at) timeline.push({ status: s, at: at.getTime() });
      };
      if (stopStatus !== 'absent') {
        if (kind === 'MORNING') {
          push(ParentTripStatus.driverOnTheWay, trip.startedAt);
          push(ParentTripStatus.arrivedAtPickup, own?.arrivedAt);
          if (own?.status === 'PICKED_UP') {
            push(ParentTripStatus.studentPickedUp, own.completedAt);
            push(ParentTripStatus.arrivedAtSchool, trip.arrivedSchoolAt);
          }
        } else {
          push(ParentTripStatus.onTheWayToSchool, trip.startedAt);
          if (own?.status === 'DROPPED_OFF') push(ParentTripStatus.arrivedAtSchool, own.completedAt);
        }
        push(ParentTripStatus.finished, trip.endedAt);
      }
      timeline.sort((a, b) => a.at - b.at);

      // The afternoon leg serves the stops in reverse order.
      const sequence = new Map(trip.route.stops.map((s) => [s.studentId, s.sequence]));
      const mySeq = sequence.get(student.id);
      const waiting = own?.status === 'PENDING' || own?.status === 'ARRIVED';
      const stopsAhead =
        trip.phase === 'IN_PROGRESS' && waiting && mySeq !== undefined
          ? trip.students.filter((s) => {
              const seq = sequence.get(s.studentId);
              if (seq === undefined || s.studentId === student.id) return false;
              if (s.status !== 'PENDING' && s.status !== 'ARRIVED') return false;
              return kind === 'MORNING' ? seq < mySeq : seq > mySeq;
            }).length
          : null;

      return {
        ...this.toSnapshot(trip),
        status,
        handoverPending: own?.handoverPending ?? false,
        handoverConfirmedAt: ms(own?.handoverConfirmedAt),
        studentId: student.code,
        studentStatus: stopStatus,
        timeline,
        scheduledTime,
        stopsAhead,
      };
    };

    const morning = view('MORNING');
    const afternoon = view('AFTERNOON');
    const afternoonStarted = afternoon.status !== ParentTripStatus.notStarted || afternoon.startedAt !== null;
    const morningOver = morning.status >= ParentTripStatus.arrivedAtSchool;
    return { morning, afternoon, activeKind: afternoonStarted || morningOver ? 'afternoon' : 'morning' };
  }

  async confirmHandover(guardian: AuthUser, input: RakazHandoverResult): Promise<void> {
    const student = await this.prisma.student.findFirst({
      where: { code: input.studentId, guardianId: guardian.id, deletedAt: null },
    });
    if (!student) throw ApiError.forbidden('هذا الطالب غير مرتبط بحسابك');
    const trip = await this.prisma.trip.findUnique({ where: { code: input.tripId }, include: { route: true } });
    if (!trip) throw ApiError.notFound('الرحلة غير موجودة');
    const row = await this.prisma.tripStudent.findUnique({
      where: { tripId_studentId: { tripId: trip.id, studentId: student.id } },
    });
    if (!row) throw ApiError.notFound('الطالب غير مسجّل في هذه الرحلة');

    const at = new Date(Math.min(input.at, Date.now() + MAX_CLOCK_SKEW_MS));
    await this.prisma.$transaction([
      this.prisma.handover.create({
        data: {
          tripId: trip.id,
          studentId: student.id,
          confirmed: input.confirmed,
          issueReported: input.issueReported,
          at,
          guardianId: guardian.id,
        },
      }),
      this.prisma.tripStudent.update({
        where: { id: row.id },
        data: {
          handoverPending: false,
          handoverConfirmedAt: input.confirmed ? at : row.handoverConfirmedAt,
          handoverIssue: input.issueReported || row.handoverIssue,
        },
      }),
    ]);

    if (input.issueReported) {
      await this.notifications.notifyAdmins({
        kind: 'EMERGENCY',
        title: 'بلاغ مشكلة في الاستلام',
        body: `${guardian.name} أبلغ عن مشكلة في استلام ${student.fullName} (${trip.route.name}).`,
        studentCode: student.code,
        tripCode: trip.code,
      });
    }
    this.realtime.tripsChanged();
  }

  // ---------------------------------------------------------------- absences hook

  /** Reflects a new or cancelled absence on today's trips that have not served the student yet. */
  async syncAbsence(
    studentId: string,
    dateISO: string,
    scope: 'FULL_DAY' | 'MORNING_ONLY' | 'RETURN_ONLY',
    absent: boolean,
  ): Promise<void> {
    const kinds: TripKind[] =
      scope === 'FULL_DAY' ? ['MORNING', 'AFTERNOON'] : scope === 'MORNING_ONLY' ? ['MORNING'] : ['AFTERNOON'];
    const trips = await this.prisma.trip.findMany({
      where: { date: dbDateFromISO(dateISO), kind: { in: kinds }, phase: { not: 'FINISHED' } },
      select: { id: true },
    });
    if (trips.length === 0) return;
    await this.prisma.tripStudent.updateMany({
      where: { tripId: { in: trips.map((t) => t.id) }, studentId, status: absent ? { in: ['PENDING', 'ARRIVED'] } : 'ABSENT' },
      data: absent ? { status: 'ABSENT', note: 'بلاغ غياب من ولي الأمر' } : { status: 'PENDING', note: '' },
    });
    this.realtime.tripsChanged();
  }

  // ---------------------------------------------------------------- overview

  async todayCounters(): Promise<{ activeTrips: number; studentsOnBoard: number; openHandovers: number; emergenciesToday: number }> {
    const dateISO = this.todayISO();
    const date = dbDateFromISO(dateISO);
    const dayStart = new Date(startOfDayMs(dateISO, this.config.timezone));
    const [activeTrips, onBoardMorning, onBoardAfternoon, openHandovers, emergenciesToday] = await this.prisma.$transaction([
      this.prisma.trip.count({ where: { date, phase: { in: ['IN_PROGRESS', 'AT_SCHOOL'] } } }),
      this.prisma.tripStudent.count({
        where: { status: 'PICKED_UP', trip: { date, kind: 'MORNING', phase: 'IN_PROGRESS' } },
      }),
      this.prisma.tripStudent.count({
        where: { status: { in: ['PENDING', 'ARRIVED'] }, trip: { date, kind: 'AFTERNOON', phase: 'IN_PROGRESS' } },
      }),
      this.prisma.tripStudent.count({ where: { handoverPending: true, trip: { date } } }),
      this.prisma.tripEvent.count({ where: { action: 'EMERGENCY', at: { gte: dayStart } } }),
    ]);
    return { activeTrips, studentsOnBoard: onBoardMorning + onBoardAfternoon, openHandovers, emergenciesToday };
  }
}
