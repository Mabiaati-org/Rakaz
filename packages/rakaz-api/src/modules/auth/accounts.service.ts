import { Injectable } from '@nestjs/common';
import type { RakazIssuedCredentials } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { Prisma, Role, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/** Account provisioning done by the administration: create users and issue temporary passwords. */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Creates an account with a temporary password that must be changed at first sign-in. */
  async create(
    input: { phone: string; name: string; role: Role },
    db: Db = this.prisma,
  ): Promise<{ user: User; credentials: RakazIssuedCredentials }> {
    const taken = await db.user.findUnique({ where: { phone: input.phone } });
    if (taken) throw ApiError.conflict('رقم الهاتف مسجّل لحساب آخر');

    const temporaryPassword = this.passwords.generateTemporary();
    const user = await db.user.create({
      data: {
        phone: input.phone,
        name: input.name,
        role: input.role,
        passwordHash: await this.passwords.hash(temporaryPassword),
        mustChangePassword: true,
      },
    });
    return { user, credentials: { uid: user.id, phone: user.phone, temporaryPassword } };
  }

  /**
   * Returns the guardian account for a phone number, creating it when it does not exist yet.
   * `credentials` is non-null only for a newly created account.
   */
  async ensureGuardian(
    phone: string,
    name: string,
    db: Db = this.prisma,
  ): Promise<{ user: User; credentials: RakazIssuedCredentials | null }> {
    const existing = await db.user.findUnique({ where: { phone } });
    if (!existing) return this.create({ phone, name, role: 'GUARDIAN' }, db);
    if (existing.role !== 'GUARDIAN') {
      throw ApiError.conflict('رقم هاتف ولي الأمر مستخدم لحساب سائق أو مدير');
    }
    return { user: existing, credentials: null };
  }

  /** Issues a new temporary password and signs the account out everywhere. */
  async resetPassword(userId: string): Promise<RakazIssuedCredentials> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw ApiError.notFound('الحساب غير موجود');

    const temporaryPassword = this.passwords.generateTemporary();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.passwords.hash(temporaryPassword), mustChangePassword: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { uid: user.id, phone: user.phone, temporaryPassword };
  }
}
