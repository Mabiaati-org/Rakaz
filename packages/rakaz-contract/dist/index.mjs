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
  RakazActionKind2["UNDO_STOP"] = "UNDO_STOP";
  RakazActionKind2["EMERGENCY_RESOLVED"] = "EMERGENCY_RESOLVED";
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
    case "UNDO_STOP" /* UNDO_STOP */:
    case "EMERGENCY_RESOLVED" /* EMERGENCY_RESOLVED */:
      return "admin";
    case "END_TRIP" /* END_TRIP */:
    case "REORDER_STOPS" /* REORDER_STOPS */:
      return null;
  }
}

// src/checkin.ts
var RAKAZ_CHECKIN_INTERVAL_SECONDS = 300;
var minutesOf = (time) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
function isWithinWorkSchedule(schedule, weekday, minutesOfDay) {
  const start = minutesOf(schedule.startTime);
  const end = minutesOf(schedule.endTime);
  if (start <= end) return schedule.days.includes(weekday) && minutesOfDay >= start && minutesOfDay < end;
  if (minutesOfDay >= start) return schedule.days.includes(weekday);
  return minutesOfDay < end && schedule.days.includes((weekday + 6) % 7);
}

// src/http.ts
var DEFAULT_RAKAZ_API_URL = "http://127.0.0.1:8787";
var RAKAZ_API_PREFIX = "/api/v1";
var p = (path) => `${RAKAZ_API_PREFIX}${path}`;
var enc = encodeURIComponent;
var RakazHttpPaths = {
  health: p("/health"),
  /** Contact details and the privacy policy link; readable before sign-in. */
  publicSettings: p("/public/settings"),
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
    preferences: p("/notifications/preferences"),
    registerDevice: p("/notifications/devices"),
    unregisterDevice: p("/notifications/devices/unregister")
  },
  driver: {
    bootstrap: p("/driver/bootstrap"),
    events: p("/driver/events"),
    location: p("/driver/location"),
    absencesToday: p("/driver/absences/today"),
    checkins: p("/driver/checkins")
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
    settings: p("/admin/settings"),
    workSchedule: p("/admin/work-schedule"),
    checkins: p("/admin/checkins")
  }
};
function resolveRakazApiUrl(explicit) {
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  return DEFAULT_RAKAZ_API_URL;
}

// src/client.ts
var RakazApiError = class extends Error {
  constructor(message, status, code, errors = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.name = "RakazApiError";
  }
  /** True when the request never got an answer (offline, DNS, timeout). */
  get isNetworkError() {
    return this.status === 0;
  }
  /** The most specific message to show the user. */
  get display() {
    return this.errors[0]?.message ?? this.message;
  }
};
function rakazErrorText(error) {
  if (error instanceof RakazApiError) return error.display;
  return error instanceof Error ? error.message : String(error);
}
var NETWORK_MESSAGE = "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062E\u0627\u062F\u0645. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B.";
var DEFAULT_TIMEOUT_MS = 15e3;
function createRakazClient(options) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const defaultTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const P = RakazHttpPaths;
  let tokens;
  let refreshing = null;
  const loadTokens = async () => {
    if (tokens === void 0) tokens = await options.storage.load().catch(() => null);
    return tokens;
  };
  const setTokens = async (next) => {
    tokens = next;
    await (next ? options.storage.save(next) : options.storage.clear()).catch(() => void 0);
  };
  const rawFetch = async (path, init, bearer) => {
    const timeoutMs = init.timeoutMs ?? defaultTimeout;
    const controller = new AbortController();
    const abort = () => controller.abort();
    init.signal?.addEventListener("abort", abort);
    const timer = timeoutMs > 0 ? setTimeout(abort, timeoutMs) : null;
    try {
      return await fetch(`${baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...init.body !== void 0 ? { "Content-Type": "application/json" } : {},
          ...bearer ? { Authorization: `Bearer ${bearer}` } : {},
          ...init.headers
        },
        body: init.body === void 0 ? void 0 : JSON.stringify(init.body),
        signal: controller.signal
      });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new RakazApiError(NETWORK_MESSAGE, 0);
    } finally {
      if (timer) clearTimeout(timer);
      init.signal?.removeEventListener("abort", abort);
    }
  };
  const failureOf = async (response) => {
    try {
      const body = await response.json();
      return new RakazApiError(body.message, response.status, body.code, body.errors ?? []);
    } catch {
      return new RakazApiError("\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639", response.status);
    }
  };
  const unwrap = async (response) => {
    if (!response.ok) throw await failureOf(response);
    const body = await response.json();
    if (!body.success) throw new RakazApiError(body.message, body.statusCode, body.code, body.errors);
    return { data: body.data, meta: body.meta };
  };
  const refresh = () => {
    refreshing ??= (async () => {
      const current = await loadTokens();
      if (!current) return false;
      try {
        const response = await rawFetch(P.auth.refresh, { method: "POST", body: { refreshToken: current.refreshToken } }, null);
        if (!response.ok) {
          if (response.status === 401) await setTokens(null);
          return false;
        }
        const { data } = await unwrap(response);
        await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };
  const authorizedFetch = async (path, init = {}) => {
    let current = await loadTokens();
    if (current && !current.accessToken && await refresh()) current = await loadTokens();
    let response = await rawFetch(path, init, current?.accessToken ?? null);
    if (response.status === 401 && await loadTokens()) {
      if (await refresh()) response = await rawFetch(path, init, tokens?.accessToken ?? null);
    }
    if (response.status === 401 && current && !await loadTokens()) options.onSessionLost?.();
    return response;
  };
  const request = async (path, method = "GET", body) => (await unwrap(await authorizedFetch(path, { method, body }))).data;
  const publicRequest = async (path, body) => (await unwrap(await rawFetch(path, { method: "POST", body }, null))).data;
  const adopt = async (session) => {
    await setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  };
  return {
    baseUrl,
    request,
    authorizedFetch,
    async requestPage(path) {
      const { data, meta } = await unwrap(await authorizedFetch(path));
      return { items: data, meta };
    },
    hasSession: async () => await loadTokens() !== null,
    login: async (phone, password) => adopt(await publicRequest(P.auth.login, { phone, password })),
    async logout() {
      const current = await loadTokens();
      await setTokens(null);
      if (current) await publicRequest(P.auth.logout, { refreshToken: current.refreshToken }).catch(() => void 0);
    },
    dropSession: () => setTokens(null),
    me: () => request(P.auth.me),
    changePassword: async (currentPassword, newPassword) => adopt(await request(P.auth.changePassword, "POST", { currentPassword, newPassword })),
    async deleteAccount(password) {
      await request(P.auth.deleteAccount, "DELETE", { password });
      await setTokens(null);
    },
    async ping() {
      try {
        const response = await rawFetch(P.health, { timeoutMs: 8e3 }, null);
        return response.ok;
      } catch {
        return false;
      }
    },
    async publicSettings() {
      try {
        return (await unwrap(await rawFetch(P.publicSettings, { timeoutMs: 8e3 }, null))).data;
      } catch {
        return null;
      }
    },
    notifications: {
      list: (page = 1, limit = 50) => request(`${P.notifications.list}?page=${page}&limit=${limit}`),
      markRead: (id) => request(P.notifications.read(id), "POST"),
      markAllRead: () => request(P.notifications.readAll, "POST"),
      remove: (id) => request(P.notifications.remove(id), "DELETE"),
      getPreferences: () => request(P.notifications.preferences),
      savePreferences: (preferences) => request(P.notifications.preferences, "PUT", preferences),
      registerDevice: (device) => request(P.notifications.registerDevice, "PUT", device),
      unregisterDevice: (token) => request(P.notifications.unregisterDevice, "POST", { token })
    }
  };
}
export {
  DEFAULT_RAKAZ_API_URL,
  ParentTripStatus,
  RAKAZ_API_PREFIX,
  RAKAZ_CHECKIN_INTERVAL_SECONDS,
  RAKAZ_MIN_PASSWORD_LENGTH,
  RakazActionKind,
  RakazApiError,
  RakazHttpPaths,
  buildTripId,
  createRakazClient,
  formatIraqiPhoneLocal,
  isWithinWorkSchedule,
  normalizeIraqiPhone,
  notificationForAction,
  parentStatusFor,
  rakazErrorText,
  resolveRakazApiUrl,
  toLatinDigits,
  todayISO,
  tripStatusForPhase
};
