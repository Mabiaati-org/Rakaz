// src/ids.ts
function buildTripId(params) {
  const kind = params.tripKind === "morning" ? "MORNING" : "AFTERNOON";
  return `TRIP-${params.dateISO}-${params.routeId}-${kind}`;
}
function todayISO(now = /* @__PURE__ */ new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// src/phone.ts
var ARABIC_DIGITS = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
var PERSIAN_DIGITS = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
function toLatinDigits(raw) {
  let out = "";
  for (const ch of raw) {
    const a = ARABIC_DIGITS.indexOf(ch);
    const p2 = PERSIAN_DIGITS.indexOf(ch);
    out += a >= 0 ? String(a) : p2 >= 0 ? String(p2) : ch;
  }
  return out;
}
function normalizeIraqiPhone(raw) {
  if (!raw) return null;
  let d = toLatinDigits(raw).replace(/\D/g, "");
  if (d.startsWith("00964")) d = d.slice(5);
  else if (d.startsWith("964")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 || !d.startsWith("7")) return null;
  return `+964${d}`;
}
function formatIraqiPhoneLocal(e164) {
  return e164.startsWith("+964") ? `0${e164.slice(4)}` : e164;
}

// src/auth.ts
var RAKAZ_MIN_PASSWORD_LENGTH = 8;

// src/events.ts
var RakazActionKind = /* @__PURE__ */ ((RakazActionKind2) => {
  RakazActionKind2["START_TRIP"] = "START_TRIP";
  RakazActionKind2["ARRIVED_AT_STOP"] = "ARRIVED_AT_STOP";
  RakazActionKind2["PICKED_UP"] = "PICKED_UP";
  RakazActionKind2["MARKED_ABSENT"] = "MARKED_ABSENT";
  RakazActionKind2["ARRIVED_AT_SCHOOL"] = "ARRIVED_AT_SCHOOL";
  RakazActionKind2["START_RETURN"] = "START_RETURN";
  RakazActionKind2["DROPPED_OFF"] = "DROPPED_OFF";
  RakazActionKind2["END_TRIP"] = "END_TRIP";
  RakazActionKind2["EMERGENCY"] = "EMERGENCY";
  RakazActionKind2["REORDER_STOPS"] = "REORDER_STOPS";
  return RakazActionKind2;
})(RakazActionKind || {});

// src/mapping.ts
var ParentTripStatus = {
  notStarted: 0,
  preparing: 1,
  driverOnTheWay: 2,
  arrivedAtPickup: 3,
  studentPickedUp: 4,
  onTheWayToSchool: 5,
  arrivedAtSchool: 6,
  finished: 7
};
function tripStatusForPhase(phase) {
  switch (phase) {
    case "notStarted":
      return ParentTripStatus.notStarted;
    case "inProgress":
      return ParentTripStatus.driverOnTheWay;
    case "atSchool":
      return ParentTripStatus.arrivedAtSchool;
    case "finished":
      return ParentTripStatus.finished;
  }
}
function parentStatusFor(tripKind, phase, stop) {
  if (phase === "notStarted" || stop === "absent") return ParentTripStatus.notStarted;
  if (phase === "finished") return ParentTripStatus.finished;
  if (tripKind === "morning") {
    if (phase === "atSchool") {
      return stop === "pickedUp" ? ParentTripStatus.arrivedAtSchool : ParentTripStatus.finished;
    }
    if (stop === "pickedUp") return ParentTripStatus.onTheWayToSchool;
    if (stop === "arrived") return ParentTripStatus.arrivedAtPickup;
    return ParentTripStatus.driverOnTheWay;
  }
  if (stop === "droppedOff") return ParentTripStatus.arrivedAtSchool;
  return ParentTripStatus.onTheWayToSchool;
}
function notificationForAction(action, tripKind) {
  const morning = tripKind === "morning";
  switch (action) {
    case "START_TRIP" /* START_TRIP */:
      return morning ? "tripStarted" : "returnStarted";
    case "START_RETURN" /* START_RETURN */:
      return "returnStarted";
    case "ARRIVED_AT_STOP" /* ARRIVED_AT_STOP */:
      return "driverNear";
    case "PICKED_UP" /* PICKED_UP */:
      return "pickedUp";
    case "DROPPED_OFF" /* DROPPED_OFF */:
      return "delivered";
    case "ARRIVED_AT_SCHOOL" /* ARRIVED_AT_SCHOOL */:
      return morning ? "arrivedSchool" : null;
    case "MARKED_ABSENT" /* MARKED_ABSENT */:
      return "admin";
    case "EMERGENCY" /* EMERGENCY */:
      return "delay";
    case "END_TRIP" /* END_TRIP */:
    case "REORDER_STOPS" /* REORDER_STOPS */:
      return null;
  }
}

// src/http.ts
var DEFAULT_RAKAZ_API_URL = "http://127.0.0.1:8787";
var RAKAZ_API_PREFIX = "/api/v1";
var p = (path) => `${RAKAZ_API_PREFIX}${path}`;
var enc = encodeURIComponent;
var RakazHttpPaths = {
  health: p("/health"),
  auth: {
    login: p("/auth/login"),
    refresh: p("/auth/refresh"),
    logout: p("/auth/logout"),
    me: p("/auth/me"),
    changePassword: p("/auth/change-password"),
    deleteAccount: p("/auth/account")
  },
  notifications: {
    list: p("/notifications"),
    read: (id) => p(`/notifications/${enc(id)}/read`),
    readAll: p("/notifications/read-all"),
    remove: (id) => p(`/notifications/${enc(id)}`),
    registerDevice: p("/notifications/devices"),
    unregisterDevice: p("/notifications/devices/unregister")
  },
  driver: {
    bootstrap: p("/driver/bootstrap"),
    events: p("/driver/events"),
    location: p("/driver/location"),
    absencesToday: p("/driver/absences/today")
  },
  parent: {
    bootstrap: p("/parent/bootstrap"),
    todayTrips: p("/parent/trips/today"),
    absences: p("/parent/absences"),
    absence: (id) => p(`/parent/absences/${enc(id)}`),
    address: (studentId) => p(`/parent/students/${enc(studentId)}/address`),
    handovers: p("/parent/handovers"),
    tickets: p("/parent/tickets")
  },
  admin: {
    overview: p("/admin/overview"),
    schools: p("/admin/schools"),
    school: (id) => p(`/admin/schools/${enc(id)}`),
    students: p("/admin/students"),
    student: (id) => p(`/admin/students/${enc(id)}`),
    studentRoute: (id) => p(`/admin/students/${enc(id)}/route`),
    studentSubscription: (id) => p(`/admin/students/${enc(id)}/subscription`),
    studentPayments: (id) => p(`/admin/students/${enc(id)}/payments`),
    drivers: p("/admin/drivers"),
    driver: (uid) => p(`/admin/drivers/${enc(uid)}`),
    guardians: p("/admin/guardians"),
    resetPassword: (uid) => p(`/admin/users/${enc(uid)}/reset-password`),
    routes: p("/admin/routes"),
    route: (id) => p(`/admin/routes/${enc(id)}`),
    routeDriver: (id) => p(`/admin/routes/${enc(id)}/driver`),
    trips: p("/admin/trips"),
    tripEvents: (tripId) => p(`/admin/trips/${enc(tripId)}/events`),
    openDailyTrips: p("/admin/trips/open-daily"),
    streamTrips: p("/admin/trips/stream"),
    absences: p("/admin/absences"),
    broadcast: p("/admin/broadcast"),
    finance: p("/admin/finance"),
    tickets: p("/admin/tickets"),
    ticket: (id) => p(`/admin/tickets/${enc(id)}`),
    settings: p("/admin/settings")
  }
};
function resolveRakazApiUrl(explicit) {
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  return DEFAULT_RAKAZ_API_URL;
}
export {
  DEFAULT_RAKAZ_API_URL,
  ParentTripStatus,
  RAKAZ_API_PREFIX,
  RAKAZ_MIN_PASSWORD_LENGTH,
  RakazActionKind,
  RakazHttpPaths,
  buildTripId,
  formatIraqiPhoneLocal,
  normalizeIraqiPhone,
  notificationForAction,
  parentStatusFor,
  resolveRakazApiUrl,
  toLatinDigits,
  todayISO,
  tripStatusForPhase
};
