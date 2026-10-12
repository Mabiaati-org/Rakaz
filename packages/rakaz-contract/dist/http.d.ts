/** Default local API for development. Override with EXPO_PUBLIC_RAKAZ_API_URL / VITE_RAKAZ_API_URL. */
export declare const DEFAULT_RAKAZ_API_URL = "http://127.0.0.1:8787";
/** Every route below is served under this prefix. */
export declare const RAKAZ_API_PREFIX = "/api/v1";
export declare const RakazHttpPaths: {
    readonly health: string;
    /** Contact details and the privacy policy link; readable before sign-in. */
    readonly publicSettings: string;
    readonly auth: {
        readonly login: string;
        readonly refresh: string;
        readonly logout: string;
        readonly me: string;
        readonly changePassword: string;
        readonly deleteAccount: string;
    };
    readonly notifications: {
        readonly list: string;
        readonly read: (id: string) => string;
        readonly readAll: string;
        readonly remove: (id: string) => string;
        readonly preferences: string;
        readonly registerDevice: string;
        readonly unregisterDevice: string;
    };
    readonly driver: {
        readonly bootstrap: string;
        readonly events: string;
        readonly location: string;
        readonly absencesToday: string;
    };
    readonly parent: {
        readonly bootstrap: string;
        readonly todayTrips: string;
        readonly absences: string;
        readonly absence: (id: string) => string;
        readonly address: (studentId: string) => string;
        readonly handovers: string;
        readonly tickets: string;
    };
    readonly admin: {
        readonly overview: string;
        readonly schools: string;
        readonly school: (id: string) => string;
        readonly students: string;
        readonly student: (id: string) => string;
        readonly studentRoute: (id: string) => string;
        readonly studentSubscription: (id: string) => string;
        readonly studentPayments: (id: string) => string;
        readonly drivers: string;
        readonly driver: (uid: string) => string;
        readonly guardians: string;
        readonly resetPassword: (uid: string) => string;
        readonly routes: string;
        readonly route: (id: string) => string;
        readonly routeDriver: (id: string) => string;
        readonly trips: string;
        readonly tripEvents: (tripId: string) => string;
        readonly openDailyTrips: string;
        readonly streamTrips: string;
        readonly absences: string;
        readonly broadcast: string;
        readonly finance: string;
        readonly tickets: string;
        readonly ticket: (id: string) => string;
        readonly settings: string;
    };
};
export declare function resolveRakazApiUrl(explicit?: string | null): string;
