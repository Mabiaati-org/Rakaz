import { RakazHttpPaths, type RakazAdminApi } from '@rakaz/contract';

import { api, openEventStream } from './client';

const P = RakazHttpPaths.admin;
const query = (params: Record<string, string | undefined>): string => {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const adminApi: RakazAdminApi = {
  getOverview: () => api(P.overview),

  listSchools: () => api(P.schools),
  saveSchool: (school) => (school.id ? api(P.school(school.id), 'PUT', school) : api(P.schools, 'POST', school)),
  deleteSchool: (id) => api(P.school(id), 'DELETE'),

  listStudents: () => api(P.students),
  saveStudent: (student) =>
    student.id ? api(P.student(student.id), 'PUT', student) : api(P.students, 'POST', student),
  deleteStudent: (id) => api(P.student(id), 'DELETE'),

  listDrivers: () => api(P.drivers),
  createDriver: (driver) => api(P.drivers, 'POST', driver),
  updateDriver: (uid, driver) => api(P.driver(uid), 'PUT', driver),
  deleteDriver: (uid) => api(P.driver(uid), 'DELETE'),

  listGuardians: () => api(P.guardians),
  resetPassword: (uid) => api(P.resetPassword(uid), 'POST'),

  listRoutes: () => api(P.routes),
  saveRoute: (route) => api(P.route(route.id), 'PUT', route),
  deleteRoute: (id) => api(P.route(id), 'DELETE'),
  assignStudentToRoute: (studentId, routeId, stop = {}) =>
    api(P.studentRoute(studentId), 'PUT', { routeId, ...stop }),
  assignDriverToRoute: (driverUid, routeId) => api(P.routeDriver(routeId), 'PUT', { driverUid }),

  listTrips: (dateISO) => api(`${P.trips}${query({ dateISO })}`),
  listTripEvents: (tripId) => api(P.tripEvents(tripId)),
  watchLiveTrips: (onChange, onError) => openEventStream(P.streamTrips, onChange, onError),
  openDailyTrips: (params) => api(P.openDailyTrips, 'POST', params),

  listAbsences: (params) => api(`${P.absences}${query({ dateISO: params?.dateISO })}`),
  broadcast: (input) => api(P.broadcast, 'POST', input),

  listFinance: () => api(P.finance),
  saveSubscription: (studentId, input) => api(P.studentSubscription(studentId), 'PUT', input),
  recordPayment: (studentId, input) => api(P.studentPayments(studentId), 'POST', input),

  listTickets: () => api(P.tickets),
  updateTicket: (id, patch) => api(P.ticket(id), 'PATCH', patch),

  getSettings: () => api(P.settings),
  saveSettings: (settings) => api(P.settings, 'PUT', settings),
};
