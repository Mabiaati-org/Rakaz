import type { Role } from '../generated/prisma/client.js';

/** The authenticated account attached to every non-public request. */
export interface AuthUser {
  id: string;
  role: Role;
  phone: string;
  name: string;
  mustChangePassword: boolean;
}
