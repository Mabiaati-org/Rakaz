import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { RakazAuthSession, RakazAuthUser } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import type { AccessTokenPayload } from '../../common/guards/jwt-auth.guard.js';
import { roleMap } from '../../common/mappers.js';
import { AppConfig } from '../../config/app-config.service.js';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PasswordService } from './password.service.js';

const DAY_MS = 86_400_000;
const INVALID_LOGIN = 'رقم الهاتف أو كلمة المرور غير صحيحة';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

type UserIdentity = Pick<User, 'id' | 'phone' | 'name' | 'role' | 'mustChangePassword'>;

export function toAuthUser(user: UserIdentity): RakazAuthUser {
  return {
    uid: user.id,
    phone: user.phone,
    name: user.name,
    role: roleMap.toWire(user.role),
    mustChangePassword: user.mustChangePassword,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly passwords: PasswordService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(phone: string, password: string): Promise<RakazAuthSession> {
    const user = await this.prisma.user.findFirst({ where: { phone, deletedAt: null } });
    const matches = await this.passwords.verify(password, user?.passwordHash ?? null);
    if (!user || !matches) throw ApiError.unauthorized(INVALID_LOGIN, 'INVALID_CREDENTIALS');
    if (!user.active) throw ApiError.unauthorized('الحساب موقوف. تواصل مع الإدارة.', 'ACCOUNT_DISABLED');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<RakazAuthSession> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    const expired = ApiError.unauthorized('انتهت الجلسة، سجّل الدخول من جديد', 'SESSION_EXPIRED');
    if (!stored) throw expired;

    if (stored.revokedAt) {
      // A rotated token was presented again: treat it as stolen and end every session of this account.
      await this.revokeAllSessions(stored.userId);
      throw expired;
    }
    if (stored.expiresAt.getTime() <= Date.now()) throw expired;
    if (stored.user.deletedAt || !stored.user.active) {
      throw ApiError.unauthorized('الحساب موقوف. تواصل مع الإدارة.', 'ACCOUNT_DISABLED');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueSession(stored.user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<RakazAuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toAuthUser(user);
  }

  /** Changes the password, ends every other session and returns a fresh one for this device. */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<RakazAuthSession> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(currentPassword, user.passwordHash))) {
      throw ApiError.badRequest('كلمة المرور الحالية غير صحيحة', [
        { field: 'currentPassword', message: 'كلمة المرور الحالية غير صحيحة' },
      ]);
    }
    if (currentPassword === newPassword) {
      throw ApiError.badRequest('اختر كلمة مرور مختلفة عن الحالية', [
        { field: 'newPassword', message: 'اختر كلمة مرور مختلفة عن الحالية' },
      ]);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(newPassword), mustChangePassword: false },
    });
    await this.revokeAllSessions(userId);
    return this.issueSession(updated);
  }

  /**
   * Permanently removes the account at the user's request (App Store / Google Play requirement).
   * Student and trip records belong to the transport administration and are kept, unlinked from the account.
   */
  async deleteAccount(actor: AuthUser, password: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await this.passwords.verify(password, user.passwordHash))) {
      throw ApiError.badRequest('كلمة المرور غير صحيحة', [{ field: 'password', message: 'كلمة المرور غير صحيحة' }]);
    }
    if (user.role === 'ADMIN') {
      const admins = await this.prisma.user.count({ where: { role: 'ADMIN', deletedAt: null, active: true } });
      if (admins <= 1) throw ApiError.conflict('لا يمكن حذف آخر حساب مدير في النظام');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.deviceToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.notification.deleteMany({ where: { userId: user.id } }),
      this.prisma.supportTicket.deleteMany({ where: { userId: user.id } }),
      this.prisma.driverProfile.deleteMany({ where: { userId: user.id } }),
      this.prisma.route.updateMany({ where: { driverId: user.id }, data: { driverId: null } }),
      this.prisma.student.updateMany({ where: { guardianId: user.id }, data: { guardianId: null } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          // Frees the phone number so the administration can register it again later.
          phone: `deleted:${user.id}`,
          name: 'حساب محذوف',
          passwordHash: await this.passwords.hash(randomBytes(24).toString('hex')),
          active: false,
          deletionRequestedAt: now,
          deletedAt: now,
        },
      }),
    ]);

    if (user.role !== 'ADMIN') {
      await this.notifications.notifyAdmins({
        kind: 'ADMIN',
        title: 'حذف حساب',
        body: `${user.name} (${user.phone}) حذف حسابه من التطبيق.`,
      });
    }
  }

  /** Ends every session of the account: refresh tokens are revoked and issued access tokens stop working. */
  async revokeAllSessions(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.user.update({ where: { id: userId }, data: { sessionsRevokedAt: now } }),
    ]);
  }

  private async issueSession(user: UserIdentity): Promise<RakazAuthSession> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.config.refreshTtlDays * DAY_MS),
      },
    });

    return { accessToken, refreshToken, expiresIn: this.config.accessTtlSeconds, user: toAuthUser(user) };
  }
}
