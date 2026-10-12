import { SetMetadata } from '@nestjs/common';

import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'rakaz:roles';

/** Restricts a controller or handler to the given roles. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
