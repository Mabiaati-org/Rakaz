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

function toWire(t: TicketRow, withAuthor: boolean, routeName?: string): RakazSupportTicket {
  return {
    id: t.id,
    code: t.code,
    kind: ticketKindMap.toWire(t.kind),
    topic: ticketTopicMap.toWire(t.topic),
    body: t.body,
    status: ticketStatusMap.toWire(t.status),
    adminReply: t.adminReply,
    createdAt: t.createdAt.getTime(),
    ...(withAuthor
      ? { authorName: t.user.name, authorPhone: t.user.phone, routeName: routeName ?? '' }
      : {}),
  };
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Route labels for guardians, joined when a family spans more than one route. */
  private async routeNamesByGuardian(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)].filter(Boolean);
    const out = new Map<string, string>();
    if (unique.length === 0) return out;
    const students = await this.prisma.student.findMany({
      where: { guardianId: { in: unique }, deletedAt: null, routeId: { not: null } },
      select: { guardianId: true, route: { select: { code: true, name: true } } },
    });
    const buckets = new Map<string, string[]>();
    for (const s of students) {
      if (!s.guardianId || !s.route) continue;
      const label = `${s.route.name} (${s.route.code})`;
      const list = buckets.get(s.guardianId) ?? [];
      if (!list.includes(label)) list.push(label);
      buckets.set(s.guardianId, list);
    }
    for (const [id, labels] of buckets) out.set(id, labels.join(' · '));
    return out;
  }

  async create(author: AuthUser, input: RakazSupportTicketInput): Promise<RakazSupportTicket> {
    const routes = await this.routeNamesByGuardian([author.id]);
    const routeName = routes.get(author.id) ?? '';
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
        const routeBit = routeName ? ` · ${routeName}` : '';
        await this.notifications.notifyAdmins({
          kind: 'ADMIN',
          title: input.kind === 'complaint' ? 'شكوى جديدة' : 'ملاحظة جديدة',
          body: `${author.name}${routeBit}: ${input.body.slice(0, 120)}`,
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
    const routes = await this.routeNamesByGuardian(rows.map((r) => r.userId));
    return rows.map((r) => toWire(r, true, routes.get(r.userId) ?? ''));
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
    const routes = await this.routeNamesByGuardian([updated.userId]);
    return toWire(updated, true, routes.get(updated.userId) ?? '');
  }

  countOpen(): Promise<number> {
    return this.prisma.supportTicket.count({ where: { status: { not: 'RESOLVED' } } });
  }
}
