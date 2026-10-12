import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Role } from '../../generated/prisma/client.js';
import { ApiError } from '../api-error.js';
import type { AuthedRequest } from '../decorators/current-user.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/** Global guard: enforces `@Roles(...)` when present. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user || !roles.includes(user.role)) throw ApiError.forbidden();
    return true;
  }
}
