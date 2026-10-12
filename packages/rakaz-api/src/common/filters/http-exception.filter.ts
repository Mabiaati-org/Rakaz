import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiFailure, ApiFieldError, RakazErrorCode } from '@rakaz/contract';
import type { Response } from 'express';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'خطأ في البيانات المدخلة',
  401: 'يجب تسجيل الدخول أولاً',
  403: 'لا تملك صلاحية تنفيذ هذا الإجراء',
  404: 'العنصر المطلوب غير موجود',
  409: 'تعارض مع البيانات الحالية',
  413: 'حجم الطلب أكبر من المسموح',
  429: 'محاولات كثيرة، حاول بعد قليل',
};

/** Turns any thrown error into the standard failure envelope. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'حدث خطأ غير متوقع، حاول مرة أخرى';
    let errors: ApiFieldError[] = [];
    let code: RakazErrorCode | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      message = STATUS_MESSAGES[statusCode] ?? message;
      if (typeof body === 'object' && body !== null) {
        const b = body as { message?: unknown; errors?: unknown; code?: unknown };
        if (Array.isArray(b.errors)) errors = b.errors as ApiFieldError[];
        if (typeof b.code === 'string') code = b.code as RakazErrorCode;
        // Only our own ApiError / validation errors carry Arabic text; framework messages stay generic.
        if (typeof b.message === 'string' && /[؀-ۿ]/.test(b.message)) message = b.message;
      }
    } else {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }

    const payload: ApiFailure = { success: false, message, errors, statusCode, ...(code ? { code } : {}) };
    response.status(statusCode).json(payload);
  }
}
