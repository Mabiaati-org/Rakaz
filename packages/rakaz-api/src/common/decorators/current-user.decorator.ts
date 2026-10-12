import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthUser } from '../auth-user.js';

export type AuthedRequest = Request & { user?: AuthUser };

/** Injects the authenticated account into a handler parameter. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthedRequest>();
  return request.user as AuthUser;
});
