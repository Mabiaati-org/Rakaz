import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiFieldError, RakazErrorCode } from '@rakaz/contract';

/** An HTTP error that carries the Arabic message, optional field errors and a machine-readable code. */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    message: string,
    details: { code?: RakazErrorCode; errors?: ApiFieldError[] } = {},
  ) {
    super({ message, ...details }, status);
  }

  static badRequest(message: string, errors: ApiFieldError[] = []): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, message, { errors });
  }
  static unauthorized(message: string, code?: RakazErrorCode): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, message, { code });
  }
  static forbidden(message = 'لا تملك صلاحية تنفيذ هذا الإجراء', code?: RakazErrorCode): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, message, { code });
  }
  static notFound(message = 'العنصر المطلوب غير موجود'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }
  static conflict(message: string, code?: RakazErrorCode): ApiError {
    return new ApiError(HttpStatus.CONFLICT, message, { code });
  }
}
