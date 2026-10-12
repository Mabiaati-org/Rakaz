import { randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { RakazSupportTicket, RakazSupportTicketInput, RakazTicketStatus } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { AuthUser } from '../../common/auth-user.js';
import { ticketKindMap, ticketStatusMap, ticketTopicMap } from '../../common/mappers.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const ticketInclude = { user: true } satisfies Prisma.SupportTicketInclude;
type TicketRow = Prisma.SupportTicketGetPayload<{ include: typeof ticketInclude }>;

function toWire(t: TicketRow, withAuthor: boolean): RakazSupportTicket {
  return {
    id: t.id,
    code: t.code,
    kind: ticketKindMap.toWire(t.kind),
    topic: ticketTopicMap.toWire(t.topic),
    body: t.body,
    status: ticketStatusMap.toWire(t.status),
    adminReply: t.adminReply,
    createdAt: t.createdAt.getTime(),
    ...(withAuthor ? { authorName: t.user.name, authorPhone: t.user.phone } : {}),
  };
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(author: AuthUser, input: RakazSupportTicketInput): Promise<RakazSupportTicket> {
    for (let attempt = 0; ; attempt++) {
      try {
        const ticket = await this.prisma.supportTicket.create({
          data: {
            code: `#${randomInt(100_000, 1_000_000)}`,
            userId: author.id,
            kind: ticketKindMap.toDb(input.kind),
            topic: ticketTopicMap.toDb(input.topic),
            body: input.body,
          },
          include: ticketInclude,
        });
        await this.notifications.notifyAdmins({
          kind: 'ADMIN',
          title: input.kind === 'complaint' ? 'شكوى جديدة' : 'ملاحظة جديدة',
          body: `${author.name}: ${input.body.slice(0, 120)}`,
        });
        return toWire(ticket, false);
      } catch (error) {
        const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!duplicate || attempt >= 5) throw error;
      }
    }
  }

  async listMine(userId: string): Promise<RakazSupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { userId },
      include: ticketInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => toWire(r, false));
  }

  async listForAdmin(): Promise<RakazSupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({ include: ticketInclude, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => toWire(r, true));
  }

  async update(id: string, patch: { status: RakazTicketStatus; adminReply: string | null }): Promise<RakazSupportTicket> {
    const existing = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('التذكرة غير موجودة');

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: ticketStatusMap.toDb(patch.status), adminReply: patch.adminReply },
      include: ticketInclude,
    });
    const replied = patch.adminReply && patch.adminReply !== existing.adminReply;
    if (replied || updated.status !== existing.status) {
      await this.notifications.notifyUsers([updated.userId], {
        kind: 'ADMIN',
        title: `تحديث على طلبك ${updated.code}`,
        body: replied ? (patch.adminReply as string) : 'تم تحديث حالة طلبك لدى الإدارة.',
      });
    }
    return toWire(updated, true);
  }

  countOpen(): Promise<number> {
    return this.prisma.supportTicket.count({ where: { status: { not: 'RESOLVED' } } });
  }
}
