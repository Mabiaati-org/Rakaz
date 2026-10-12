/** Default local API for development. Override with EXPO_PUBLIC_RAKAZ_API_URL / VITE_RAKAZ_API_URL. */
export const DEFAULT_RAKAZ_API_URL = 'http://127.0.0.1:8787';

/** Every route below is served under this prefix. */
export const RAKAZ_API_PREFIX = '/api/v1';

const p = (path: string): string => `${RAKAZ_API_PREFIX}${path}`;
const enc = encodeURIComponent;

export const RakazHttpPaths = {
  health: p('/health'),
  /** Contact details and the privacy policy link; readable before sign-in. */
  publicSettings: p('/public/settings'),

  auth: {
    login: p('/auth/login'),
    refresh: p('/auth/refresh'),
    logout: p('/auth/logout'),
    me: p('/auth/me'),
    changePassword: p('/auth/change-password'),
    deleteAccount: p('/auth/account'),
  },

  notifications: {
    list: p('/notifications'),
    read: (id: string) => p(`/notifications/${enc(id)}/read`),
    readAll: p('/notifications/read-all'),
    remove: (id: string) => p(`/notifications/${enc(id)}`),
    preferences: p('/notifications/preferences'),
    registerDevice: p('/notifications/devices'),
    unregisterDevice: p('/notifications/devices/unregister'),
  },

  driver: {
    bootstrap: p('/driver/bootstrap'),
    events: p('/driver/events'),
    location: p('/driver/location'),
    absencesToday: p('/driver/absences/today'),
  },

  parent: {
    bootstrap: p('/parent/bootstrap'),
    todayTrips: p('/parent/trips/today'),
    absences: p('/parent/absences'),
    absence: (id: string) => p(`/parent/absences/${enc(id)}`),
    address: (studentId: string) => p(`/parent/students/${enc(studentId)}/address`),
    handovers: p('/parent/handovers'),
    tickets: p('/parent/tickets'),
  },

  admin: {
    overview: p('/admin/overview'),
    schools: p('/admin/schools'),
    school: (id: string) => p(`/admin/schools/${enc(id)}`),
    students: p('/admin/students'),
    student: (id: string) => p(`/admin/students/${enc(id)}`),
    studentRoute: (id: string) => p(`/admin/students/${enc(id)}/route`),
    studentSubscription: (id: string) => p(`/admin/students/${enc(id)}/subscription`),
    studentPayments: (id: string) => p(`/admin/students/${enc(id)}/payments`),
    drivers: p('/admin/drivers'),
    driver: (uid: string) => p(`/admin/drivers/${enc(uid)}`),
    guardians: p('/admin/guardians'),
    resetPassword: (uid: string) => p(`/admin/users/${enc(uid)}/reset-password`),
    routes: p('/admin/routes'),
    route: (id: string) => p(`/admin/routes/${enc(id)}`),
    routeDriver: (id: string) => p(`/admin/routes/${enc(id)}/driver`),
    trips: p('/admin/trips'),
    tripEvents: (tripId: string) => p(`/admin/trips/${enc(tripId)}/events`),
    openDailyTrips: p('/admin/trips/open-daily'),
    streamTrips: p('/admin/trips/stream'),
    absences: p('/admin/absences'),
    broadcast: p('/admin/broadcast'),
    finance: p('/admin/finance'),
    tickets: p('/admin/tickets'),
    ticket: (id: string) => p(`/admin/tickets/${enc(id)}`),
    settings: p('/admin/settings'),
  },
} as const;

export function resolveRakazApiUrl(explicit?: string | null): string {
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, '');
  return DEFAULT_RAKAZ_API_URL;
}
