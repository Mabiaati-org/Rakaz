export interface ApiPageMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
/** Every successful JSON response from rakaz-api. */
export interface ApiSuccess<T> {
    success: true;
    data: T;
    message: string;
    meta?: ApiPageMeta;
}
export interface ApiFieldError {
    field: string;
    message: string;
}
/** Every failed JSON response from rakaz-api. */
export interface ApiFailure {
    success: false;
    message: string;
    errors: ApiFieldError[];
    statusCode: number;
    /** Machine-readable reason, when the client must react to it (see `RakazErrorCode`). */
    code?: RakazErrorCode;
}
export type RakazErrorCode = 'PASSWORD_CHANGE_REQUIRED' | 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'SESSION_EXPIRED' | 'NO_ROUTE_ASSIGNED' | 'OUTSIDE_WORKING_HOURS';
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
