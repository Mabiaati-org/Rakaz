import { Injectable } from '@nestjs/common';
import type { RakazAdminGuardian, RakazAdminOverview, RakazBroadcastInput } from '@rakaz/contract';

import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AbsencesService } from '../absences/absences.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { TripsService } from '../trips/trips.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly absences: AbsencesService,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
  ) {}

  async overview(): Promise<RakazAdminOverview> {
    const [counters, absencesToday, openTickets, unassignedDrivers] = await Promise.all([
      this.trips.todayCounters(),
      this.absences.countToday(),
      this.tickets.countOpen(),
      this.prisma.user.count({ where: { role: 'DRIVER', active: true, deletedAt: null, route: null } }),
    ]);
    return { ...counters, absencesToday, openTickets, unassignedDrivers, updatedAt: Date.now() };
  }

  async listGuardians(): Promise<RakazAdminGuardian[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: 'GUARDIAN', deletedAt: null },
      include: { students: { where: { deletedAt: null }, select: { code: true } } },
      orderBy: { name: 'asc' },
    });
    return rows.map((u) => ({
      uid: u.id,
      name: u.name,
      phone: u.phone,
      studentIds: u.students.map((s) => s.code),
      active: u.active,
      mustChangePassword: u.mustChangePassword,
    }));
  }

  async broadcast(input: RakazBroadcastInput): Promise<{ recipients: number }> {
    const recipients = new Set<string>();
    const activeUser = { active: true, deletedAt: null } satisfies Prisma.UserWhereInput;

    if (input.audience !== 'drivers') {
      const students = await this.prisma.student.findMany({
        where: {
          deletedAt: null,
          guardian: activeUser,
          ...(input.studentIds?.length ? { code: { in: input.studentIds } } : {}),
          ...(input.routeId ? { route: { code: input.routeId } } : {}),
        },
        select: { guardianId: true },
      });
      for (const s of students) if (s.guardianId) recipients.add(s.guardianId);
    }
    if (input.audience !== 'guardians') {
      const drivers = await this.prisma.user.findMany({
        where: { role: 'DRIVER', ...activeUser, ...(input.routeId ? { route: { code: input.routeId } } : {}) },
        select: { id: true },
      });
      for (const d of drivers) recipients.add(d.id);
    }

    const count = await this.notifications.notifyUsers([...recipients], {
      kind: 'ADMIN',
      title: input.title,
      body: input.body,
    });
    return { recipients: count };
  }
}
