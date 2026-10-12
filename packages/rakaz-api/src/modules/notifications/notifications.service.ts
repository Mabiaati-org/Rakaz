import { Injectable } from '@nestjs/common';
import type { RakazNotificationPreferences, RakazParentNotification } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import { Paginated, type PaginationDto } from '../../common/dto/pagination.dto.js';
import { notificationKindMap } from '../../common/mappers.js';
import type { DevicePlatform, Notification, NotificationKind } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PushService } from './push.service.js';

export interface NotificationInput {
  kind: NotificationKind;
  title: string;
  body: string;
  studentCode?: string | null;
  tripCode?: string | null;
}

function toWire(n: Notification): RakazParentNotification {
  return {
    id: n.id,
    kind: notificationKindMap.toWire(n.kind),
    title: n.title,
    body: n.body,
    studentId: n.studentCode,
    tripId: n.tripCode,
    at: n.createdAt.getTime(),
    read: n.readAt !== null,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /** Stores an inbox item for each user and sends it as a push notification. */
  async notifyUsers(userIds: Array<string | null | undefined>, input: NotificationInput): Promise<number> {
    const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return 0;

    await this.prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        studentCode: input.studentCode ?? null,
        tripCode: input.tripCode ?? null,
      })),
    });

    // Muting a kind silences the push only; the inbox above still records it.
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, mutedNotificationKinds: true },
    });
    const pushIds = recipients.filter((u) => !u.mutedNotificationKinds.split(',').includes(input.kind)).map((u) => u.id);

    void this.push.sendToUsers(pushIds, {
      title: input.title,
      body: input.body,
      data: {
        kind: notificationKindMap.toWire(input.kind),
        studentId: input.studentCode ?? null,
        tripId: input.tripCode ?? null,
      },
    });
    return ids.length;
  }

  async notifyAdmins(input: NotificationInput): Promise<number> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', active: true, deletedAt: null },
      select: { id: true },
    });
    return this.notifyUsers(
      admins.map((a) => a.id),
      input,
    );
  }

  async list(userId: string, query: PaginationDto): Promise<Paginated<RakazParentNotification>> {
    const where = { userId, deletedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new Paginated(rows.map(toWire), total, query);
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, deletedAt: null, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) throw ApiError.notFound('الإشعار غير موجود');
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) throw ApiError.notFound('الإشعار غير موجود');
  }

  async getPreferences(userId: string): Promise<RakazNotificationPreferences> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { mutedNotificationKinds: true } });
    const muted = user.mutedNotificationKinds.split(',').filter(Boolean) as NotificationKind[];
    return { muted: muted.map((kind) => notificationKindMap.toWire(kind)) };
  }

  async savePreferences(userId: string, preferences: RakazNotificationPreferences): Promise<RakazNotificationPreferences> {
    const muted = [...new Set(preferences.muted)].map((kind) => notificationKindMap.toDb(kind));
    await this.prisma.user.update({ where: { id: userId }, data: { mutedNotificationKinds: muted.join(',') } });
    return this.getPreferences(userId);
  }

  /** A device belongs to whoever signed in on it last. */
  async registerDevice(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    const dbPlatform = platform.toUpperCase() as DevicePlatform;
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { token, userId, platform: dbPlatform },
      update: { userId, platform: dbPlatform },
    });
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
  }
}
