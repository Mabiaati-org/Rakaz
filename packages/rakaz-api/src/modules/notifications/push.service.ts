import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import { AppConfig } from '../../config/app-config.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string | null>;
}

/** Delivers push notifications through the Expo push service. */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;
  private readonly enabled: boolean;

  constructor(
    config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    this.expo = new Expo({ accessToken: config.expoAccessToken });
    this.enabled = config.env !== 'test';
  }

  /** Never throws: a push failure must not fail the request that triggered it. */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.enabled || userIds.length === 0) return;
    try {
      const devices = await this.prisma.deviceToken.findMany({ where: { userId: { in: userIds } } });
      const messages: ExpoPushMessage[] = devices
        .filter((d) => Expo.isExpoPushToken(d.token))
        .map((d) => ({
          to: d.token,
          sound: 'default',
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          channelId: 'default',
        }));
      if (messages.length === 0) return;

      const stale: string[] = [];
      for (const chunk of this.expo.chunkPushNotifications(messages)) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            stale.push(String(chunk[i]!.to));
          }
        });
      }
      if (stale.length > 0) await this.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
    } catch (error) {
      this.logger.warn(`Push delivery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
