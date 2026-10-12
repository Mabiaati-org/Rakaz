import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { ApiFailure } from '@rakaz/contract';
import type { Response } from 'express';

import { Prisma } from '../../generated/prisma/client.js';

/** Maps known Prisma errors to consistent API failures instead of 500s. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaException');

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'حدث خطأ في قاعدة البيانات';

    switch (exception.code) {
      case 'P2002':
        statusCode = HttpStatus.CONFLICT;
        message = 'القيمة مستخدمة مسبقاً';
        break;
      case 'P2025':
        statusCode = HttpStatus.NOT_FOUND;
        message = 'العنصر المطلوب غير موجود';
        break;
      case 'P2003':
        statusCode = HttpStatus.CONFLICT;
        message = 'لا يمكن تنفيذ العملية لوجود بيانات مرتبطة';
        break;
      default:
        this.logger.error(`${exception.code}: ${exception.message}`);
    }

    const payload: ApiFailure = { success: false, message, errors: [], statusCode };
    response.status(statusCode).json(payload);
  }
}
