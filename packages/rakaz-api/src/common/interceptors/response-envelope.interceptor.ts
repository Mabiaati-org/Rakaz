import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiSuccess } from '@rakaz/contract';
import { map, type Observable } from 'rxjs';

import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator.js';
import { Paginated, WithMessage } from '../dto/pagination.dto.js';

const DEFAULT_MESSAGE = 'تم بنجاح';

/** Wraps every handler result as `{ success, data, message, meta? }`. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.reflector.get<boolean>(SKIP_ENVELOPE_KEY, context.getHandler())) return next.handle();

    return next.handle().pipe(
      map((result: unknown): ApiSuccess<unknown> => {
        if (result instanceof Paginated) {
          return { success: true, data: result.items, message: DEFAULT_MESSAGE, meta: result.meta };
        }
        if (result instanceof WithMessage) {
          return { success: true, data: result.data ?? null, message: result.message };
        }
        return { success: true, data: result ?? null, message: DEFAULT_MESSAGE };
      }),
    );
  }
}
