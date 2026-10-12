import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PASSWORD_KEY = 'rakaz:allowPendingPassword';

/** Lets an account that still has its temporary password call this route. */
export const AllowPendingPassword = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true);
