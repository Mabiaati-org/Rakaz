import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiError } from '../api-error.js';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator.js';
import type { AuthedRequest } from '../decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

/** Global guard: every route needs a valid access token unless marked `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw ApiError.unauthorized('يجب تسجيل الدخول أولاً', 'SESSION_EXPIRED');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw ApiError.unauthorized('انتهت الجلسة، سجّل الدخول من جديد', 'SESSION_EXPIRED');
    }

    // Looked up on every request so a disabled or deleted account loses access immediately.
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, role: true, phone: true, name: true, active: true, mustChangePassword: true },
    });
    if (!user || !user.active) throw ApiError.unauthorized('الحساب غير مفعّل', 'ACCOUNT_DISABLED');

    if (user.mustChangePassword && !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_KEY, targets)) {
      throw ApiError.forbidden('يجب تغيير كلمة المرور المؤقتة أولاً', 'PASSWORD_CHANGE_REQUIRED');
    }

    request.user = {
      id: user.id,
      role: user.role,
      phone: user.phone,
      name: user.name,
      mustChangePassword: user.mustChangePassword,
    };
    return true;
  }
}
