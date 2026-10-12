import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  RakazHttpPaths as P,
  type RakazAdminDriverResult,
  type RakazAdminStudentResult,
  type RakazAdminTrip,
  type RakazAuthSession,
  type RakazDriverBootstrap,
  type RakazParentBootstrap,
  type RakazParentNotification,
  type RakazParentTripView,
} from '@rakaz/contract';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { dateISOInTz } from '../src/common/time.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

const ADMIN = { phone: '07700000001', password: 'Admin-pass-2026' };
const NEW_PASSWORD = 'new-pass-2026';

describe('Rakaz API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  let adminToken: string;
  let schoolId: string;
  let driverUid: string;
  let driverToken: string;
  let guardianAToken: string;
  let guardianBToken: string;
  const studentA = 'STU-90001';
  let studentB: string;

  const login = async (phone: string, password: string): Promise<RakazAuthSession> => {
    const res = await http().post(P.auth.login).send({ phone, password }).expect(200);
    return res.body.data as RakazAuthSession;
  };

  /** Signs in with a temporary password and replaces it, as the apps force the user to do. */
  const activate = async (phone: string, temporaryPassword: string): Promise<string> => {
    const session = await login(phone, temporaryPassword);
    expect(session.user.mustChangePassword).toBe(true);
    const res = await http()
      .post(P.auth.changePassword)
      .set(auth(session.accessToken))
      .send({ currentPassword: temporaryPassword, newPassword: NEW_PASSWORD })
      .expect(200);
    const fresh = res.body.data as RakazAuthSession;
    expect(fresh.user.mustChangePassword).toBe(false);
    return fresh.accessToken;
  };

  const studentBody = (overrides: Record<string, unknown>) => ({
    internalNumber: '',
    fullName: 'طالب تجريبي',
    firstName: 'طالب',
    grade: 'الصف الرابع',
    stage: 'الابتدائية',
    gender: null,
    birthDate: null,
    schoolId,
    guardianName: 'ولي أمر',
    guardianPhone: '07711111111',
    home: { latitude: 30.52, longitude: 47.79 },
    governorate: 'البصرة',
    area: 'العشار',
    neighborhood: '',
    street: '',
    landmark: '',
    accessNotes: '',
    notes: '',
    active: true,
    ...overrides,
  });

  const event = (action: string, tripKind: 'morning' | 'afternoon', studentId: string | null = null) => ({
    id: randomUUID(),
    tripKind,
    action,
    studentId,
    at: Date.now(),
    location: { latitude: 30.52, longitude: 47.79 },
    detail: null,
    schemaVersion: 1,
  });

  const todayTrips = async (token: string, studentId: string) => {
    const res = await http().get(P.parent.todayTrips).query({ studentId }).set(auth(token)).expect(200);
    return res.body.data as { morning: RakazParentTripView; afternoon: RakazParentTripView; activeKind: string };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // Wipe in dependency order; the test database is disposable.
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.subscription.deleteMany(),
      prisma.handover.deleteMany(),
      prisma.locationPing.deleteMany(),
      prisma.tripEvent.deleteMany(),
      prisma.tripStudent.deleteMany(),
      prisma.trip.deleteMany(),
      prisma.absence.deleteMany(),
      prisma.routeStop.deleteMany(),
      prisma.student.deleteMany(),
      prisma.route.deleteMany(),
      prisma.school.deleteMany(),
      prisma.supportTicket.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.deviceToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.driverProfile.deleteMany(),
      prisma.user.deleteMany(),
      prisma.appSetting.deleteMany(),
    ]);
    await prisma.user.create({
      data: {
        phone: '+9647700000001',
        name: 'مدير الاختبار',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(ADMIN.password, 4),
        mustChangePassword: false,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('access control', () => {
    it('serves health without a token', async () => {
      const res = await http().get(P.health).expect(200);
      expect(res.body).toMatchObject({ success: true, data: { ok: true } });
    });

    it('rejects protected routes without a token', async () => {
      const res = await http().get(P.admin.students).expect(401);
      expect(res.body).toMatchObject({ success: false, statusCode: 401, code: 'SESSION_EXPIRED' });
    });

    it('rejects a wrong password and an unknown phone the same way', async () => {
      const wrong = await http().post(P.auth.login).send({ phone: ADMIN.phone, password: 'nope' }).expect(401);
      const unknown = await http().post(P.auth.login).send({ phone: '07799999999', password: 'nope' }).expect(401);
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('reports field errors for invalid input', async () => {
      const res = await http().post(P.auth.login).send({ phone: '123', password: 'x' }).expect(400);
      expect(res.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'phone' })]));
    });

    it('signs the admin in', async () => {
      const session = await login(ADMIN.phone, ADMIN.password);
      expect(session.user).toMatchObject({ role: 'admin', phone: '+9647700000001', mustChangePassword: false });
      adminToken = session.accessToken;
    });
  });

  describe('administration sets up the data', () => {
    it('creates a school, a driver, students and a route', async () => {
      const school = await http()
        .post(P.admin.schools)
        .set(auth(adminToken))
        .send({
          name: 'مدرسة الاختبار',
          address: 'البصرة',
          locationLabel: 'البوابة الرئيسية',
          coordinate: { latitude: 30.5156, longitude: 47.8125 },
          phone: '07801112233',
          startTime: '07:45',
          endTime: '13:15',
        })
        .expect(201);
      schoolId = school.body.data.id;

      const driverRes = await http()
        .post(P.admin.drivers)
        .set(auth(adminToken))
        .send({
          name: 'سائق الاختبار',
          phone: '07705550000',
          vehicleLabel: 'باص 1',
          plateNumber: 'بصرة 1',
          vehicleModel: '',
          vehicleColor: '',
          vehicleCapacity: 20,
          active: true,
        })
        .expect(201);
      const driver = driverRes.body.data as RakazAdminDriverResult;
      expect(driver.credentials?.temporaryPassword).toHaveLength(10);
      driverUid = driver.driver.uid;

      const a = await http()
        .post(P.admin.students)
        .set(auth(adminToken))
        .send(studentBody({ id: studentA, fullName: 'لبان أحمد', firstName: 'لبان', guardianPhone: '07711111111' }))
        .expect(201);
      const resultA = a.body.data as RakazAdminStudentResult;
      expect(resultA.guardianCredentials?.phone).toBe('+9647711111111');

      const b = await http()
        .post(P.admin.students)
        .set(auth(adminToken))
        .send(studentBody({ fullName: 'مريم سعد', firstName: 'مريم', guardianName: 'سعد', guardianPhone: '07722222222' }))
        .expect(201);
      const resultB = b.body.data as RakazAdminStudentResult;
      studentB = resultB.student.id;
      expect(studentB).toMatch(/^STU-\d+$/);

      // A second child for an existing guardian reuses the account and issues no new password.
      const sibling = await http()
        .post(P.admin.students)
        .set(auth(adminToken))
        .send(studentBody({ fullName: 'راشد أحمد', firstName: 'راشد', guardianPhone: '07711111111' }))
        .expect(201);
      expect((sibling.body.data as RakazAdminStudentResult).guardianCredentials).toBeNull();

      await http()
        .post(P.admin.routes)
        .set(auth(adminToken))
        .send({ id: 'R-1', name: 'خط الاختبار', schoolId, depot: null, active: true })
        .expect(201);
      await http().put(P.admin.routeDriver('R-1')).set(auth(adminToken)).send({ driverUid }).expect(200);
      await http().put(P.admin.studentRoute(studentA)).set(auth(adminToken)).send({ routeId: 'R-1', pickupTime: '06:40' }).expect(200);
      await http().put(P.admin.studentRoute(studentB)).set(auth(adminToken)).send({ routeId: 'R-1' }).expect(200);

      const routes = await http().get(P.admin.routes).set(auth(adminToken)).expect(200);
      expect(routes.body.data[0]).toMatchObject({ id: 'R-1', driverUid });
      expect(routes.body.data[0].stops.map((s: { studentId: string }) => s.studentId)).toEqual([studentA, studentB]);

      driverToken = await activate('07705550000', driver.credentials!.temporaryPassword);
      guardianAToken = await activate('07711111111', resultA.guardianCredentials!.temporaryPassword);
      guardianBToken = await activate('07722222222', resultB.guardianCredentials!.temporaryPassword);
    });

    it('blocks an account that still has its temporary password', async () => {
      const reset = await http().post(P.admin.resetPassword(driverUid)).set(auth(adminToken)).expect(200);
      const session = await login('07705550000', reset.body.data.temporaryPassword);
      const res = await http().get(P.driver.bootstrap).set(auth(session.accessToken)).expect(403);
      expect(res.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
      driverToken = await activate('07705550000', reset.body.data.temporaryPassword);
    });

    it('keeps each role inside its own area', async () => {
      await http().get(P.admin.students).set(auth(driverToken)).expect(403);
      await http().get(P.admin.students).set(auth(guardianAToken)).expect(403);
      await http().get(P.driver.bootstrap).set(auth(guardianAToken)).expect(403);
      await http().get(P.parent.bootstrap).set(auth(driverToken)).expect(403);
    });

    it('hides other families from a guardian', async () => {
      await http().get(P.parent.todayTrips).query({ studentId: studentB }).set(auth(guardianAToken)).expect(403);
      await http()
        .put(P.parent.address(studentB))
        .set(auth(guardianAToken))
        .send({ governorate: '', area: '', neighborhood: '', street: '', landmark: '', accessNotes: '', latitude: 30, longitude: 47 })
        .expect(403);
    });
  });

  describe('a school day', () => {
    it('gives the driver the real route', async () => {
      const res = await http().get(P.driver.bootstrap).set(auth(driverToken)).expect(200);
      const boot = res.body.data as RakazDriverBootstrap;
      expect(boot.route?.id).toBe('R-1');
      expect(boot.route?.students.map((s) => s.id)).toEqual([studentA, studentB]);
      expect(boot.route?.stops[0]).toMatchObject({ studentId: studentA, pickupTime: '06:40' });
      expect(boot.today.morning).toBeNull();
    });

    it('applies an absence reported before the trip starts', async () => {
      const dateISO = dateISOInTz(Date.now(), 'Asia/Baghdad');
      await http()
        .post(P.parent.absences)
        .set(auth(guardianBToken))
        .send({ studentId: studentB, dateISO, scope: 'fullDay', reason: 'sick', note: '' })
        .expect(201);

      const seen = await http().get(P.driver.absencesToday).set(auth(driverToken)).expect(200);
      expect(seen.body.data).toEqual([expect.objectContaining({ studentId: studentB, scope: 'fullDay' })]);

      const overview = await http().get(P.admin.overview).set(auth(adminToken)).expect(200);
      expect(overview.body.data.absencesToday).toBe(1);
    });

    it('turns driver events into what each guardian sees', async () => {
      const events = [event('START_TRIP', 'morning'), event('ARRIVED_AT_STOP', 'morning', studentA), event('PICKED_UP', 'morning', studentA)];
      const first = await http().post(P.driver.events).set(auth(driverToken)).send({ events }).expect(200);
      expect(first.body.data).toEqual({ accepted: 3, duplicates: 0 });

      // The app retries its queue after a dropped connection; nothing may be applied twice.
      const retry = await http().post(P.driver.events).set(auth(driverToken)).send({ events }).expect(200);
      expect(retry.body.data).toEqual({ accepted: 0, duplicates: 3 });

      const a = await todayTrips(guardianAToken, studentA);
      expect(a.activeKind).toBe('morning');
      expect(a.morning).toMatchObject({ status: 5, studentStatus: 'pickedUp', scheduledTime: '06:40' });
      expect(a.morning.busLocation).toEqual({ latitude: 30.52, longitude: 47.79 });
      expect(a.morning.timeline.map((t) => t.status)).toEqual([2, 3, 4]);

      // The absent child's guardian must not be told their child was picked up.
      const b = await todayTrips(guardianBToken, studentB);
      expect(b.morning).toMatchObject({ status: 0, studentStatus: 'absent' });

      const inbox = await http().get(P.notifications.list).set(auth(guardianAToken)).expect(200);
      const kinds = (inbox.body.data as RakazParentNotification[]).map((n) => n.kind);
      expect(kinds).toEqual(expect.arrayContaining(['tripStarted', 'driverNear', 'pickedUp']));
      const inboxB = await http().get(P.notifications.list).set(auth(guardianBToken)).expect(200);
      expect((inboxB.body.data as RakazParentNotification[]).map((n) => n.kind)).not.toContain('pickedUp');
    });

    it('moves the live marker from location pings', async () => {
      await http()
        .post(P.driver.location)
        .set(auth(driverToken))
        .send({ pings: [{ tripKind: 'morning', latitude: 30.6, longitude: 47.9, at: Date.now() + 1000, speed: 9, heading: 90 }] })
        .expect(200);
      const a = await todayTrips(guardianAToken, studentA);
      expect(a.morning.busLocation).toEqual({ latitude: 30.6, longitude: 47.9 });
    });

    it('shows the trip with every student on the dashboard', async () => {
      const res = await http().get(P.admin.trips).set(auth(adminToken)).expect(200);
      const morning = (res.body.data as RakazAdminTrip[]).find((t) => t.tripKind === 'morning');
      expect(morning).toMatchObject({ routeId: 'R-1', phase: 'inProgress', driverName: 'سائق الاختبار' });
      expect(morning?.students.map((s) => [s.studentId, s.status])).toEqual([
        [studentA, 'pickedUp'],
        [studentB, 'absent'],
      ]);
      const overview = await http().get(P.admin.overview).set(auth(adminToken)).expect(200);
      expect(overview.body.data).toMatchObject({ activeTrips: 1, studentsOnBoard: 1 });
    });

    it('finishes the morning and runs the return trip with a handover', async () => {
      await http().post(P.driver.events).set(auth(driverToken)).send({ events: [event('ARRIVED_AT_SCHOOL', 'morning')] }).expect(200);
      expect((await todayTrips(guardianAToken, studentA)).morning.status).toBe(6);

      await http()
        .post(P.driver.events)
        .set(auth(driverToken))
        .send({ events: [event('START_RETURN', 'afternoon'), event('DROPPED_OFF', 'afternoon', studentA)] })
        .expect(200);

      const after = await todayTrips(guardianAToken, studentA);
      expect(after.activeKind).toBe('afternoon');
      expect(after.morning.status).toBe(7);
      expect(after.afternoon).toMatchObject({ status: 6, studentStatus: 'droppedOff', handoverPending: true });

      await http()
        .post(P.parent.handovers)
        .set(auth(guardianAToken))
        .send({ tripId: after.afternoon.tripId, studentId: studentA, confirmed: true, issueReported: false, at: Date.now() })
        .expect(200);
      const confirmed = await todayTrips(guardianAToken, studentA);
      expect(confirmed.afternoon.handoverPending).toBe(false);
      expect(confirmed.afternoon.handoverConfirmedAt).not.toBeNull();

      await http().post(P.driver.events).set(auth(driverToken)).send({ events: [event('END_TRIP', 'afternoon')] }).expect(200);
      expect((await todayTrips(guardianAToken, studentA)).afternoon.status).toBe(7);

      const boot = await http().get(P.driver.bootstrap).set(auth(driverToken)).expect(200);
      expect((boot.body.data as RakazDriverBootstrap).today.afternoon?.phase).toBe('finished');
      expect((boot.body.data as RakazDriverBootstrap).completedTripsTotal).toBe(2);
    });
  });

  describe('finance, support and account lifecycle', () => {
    it('shows recorded payments to the guardian', async () => {
      await http()
        .put(P.admin.studentSubscription(studentA))
        .set(auth(adminToken))
        .send({ periodTitle: 'العام الحالي', monthlyFee: 85000, yearlyFee: 850000, dueAmount: 850000, dueDate: Date.now() + 86_400_000 })
        .expect(200);
      const pay = await http()
        .post(P.admin.studentPayments(studentA))
        .set(auth(adminToken))
        .send({ amount: 50000, date: Date.now(), method: 'cash', note: '' })
        .expect(201);
      expect(pay.body.data.code).toMatch(/^TX-\d+$/);

      const res = await http().get(P.parent.bootstrap).set(auth(guardianAToken)).expect(200);
      const boot = res.body.data as RakazParentBootstrap;
      expect(boot.students).toHaveLength(2);
      const child = boot.students.find((s) => s.id === studentA)!;
      expect(child.subscription).toMatchObject({ dueAmount: 850000, paidAmount: 50000 });
      expect(child.payments).toHaveLength(1);
      expect(child.driver?.name).toBe('سائق الاختبار');
    });

    it('sends a support ticket to the dashboard and the reply back', async () => {
      const created = await http()
        .post(P.parent.tickets)
        .set(auth(guardianAToken))
        .send({ kind: 'complaint', topic: 'timing', body: 'الباص يتأخر كل يوم' })
        .expect(201);
      const list = await http().get(P.admin.tickets).set(auth(adminToken)).expect(200);
      expect(list.body.data[0]).toMatchObject({ id: created.body.data.id, authorName: 'ولي أمر', status: 'open' });

      await http()
        .patch(P.admin.ticket(created.body.data.id))
        .set(auth(adminToken))
        .send({ status: 'resolved', adminReply: 'تم تعديل وقت المرور' })
        .expect(200);
      const mine = await http().get(P.parent.tickets).set(auth(guardianAToken)).expect(200);
      expect(mine.body.data[0]).toMatchObject({ status: 'resolved', adminReply: 'تم تعديل وقت المرور' });
    });

    it('remembers which notification kinds a user muted', async () => {
      const saved = await http()
        .put(P.notifications.preferences)
        .set(auth(guardianAToken))
        .send({ muted: ['payment', 'driverNear'] })
        .expect(200);
      expect(saved.body.data.muted.sort()).toEqual(['driverNear', 'payment']);
      const read = await http().get(P.notifications.preferences).set(auth(guardianAToken)).expect(200);
      expect(read.body.data.muted.sort()).toEqual(['driverNear', 'payment']);
      await http().put(P.notifications.preferences).set(auth(guardianAToken)).send({ muted: ['nope'] }).expect(400);
    });

    it('rotates refresh tokens and ends every session when an old one is replayed', async () => {
      const session = await login('07722222222', NEW_PASSWORD);
      const rotated = await http().post(P.auth.refresh).send({ refreshToken: session.refreshToken }).expect(200);
      const next = rotated.body.data as RakazAuthSession;
      expect(next.refreshToken).not.toBe(session.refreshToken);

      await http().post(P.auth.refresh).send({ refreshToken: session.refreshToken }).expect(401);
      await http().post(P.auth.refresh).send({ refreshToken: next.refreshToken }).expect(401);
    });

    it('deletes an account on request and frees its phone number', async () => {
      const session = await login('07722222222', NEW_PASSWORD);
      await http().delete(P.auth.deleteAccount).set(auth(session.accessToken)).send({ password: 'wrong' }).expect(400);
      await http().delete(P.auth.deleteAccount).set(auth(session.accessToken)).send({ password: NEW_PASSWORD }).expect(200);

      await http().get(P.parent.bootstrap).set(auth(session.accessToken)).expect(401);
      await http().post(P.auth.login).send({ phone: '07722222222', password: NEW_PASSWORD }).expect(401);

      const students = await http().get(P.admin.students).set(auth(adminToken)).expect(200);
      const orphan = (students.body.data as Array<{ id: string; guardianUid: string | null }>).find((s) => s.id === studentB);
      expect(orphan?.guardianUid).toBeNull();
    });
  });
});
