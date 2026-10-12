import { Injectable } from '@nestjs/common';
import type { RakazSupportContact, RakazWorkSchedule } from '@rakaz/contract';

import { PrismaService } from '../../prisma/prisma.service.js';

const KEYS = ['adminPhone', 'whatsappNumber', 'privacyPolicyUrl'] as const satisfies ReadonlyArray<
  keyof RakazSupportContact
>;

// Sunday to Thursday, covering the morning run and the trip home.
const DEFAULT_SCHEDULE: RakazWorkSchedule = { startTime: '06:00', endTime: '15:00', days: [0, 1, 2, 3, 4] };

/** Contact details shown inside the apps and the drivers' duty hours, editable from the dashboard. */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<RakazSupportContact> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { in: [...KEYS] } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      adminPhone: byKey.get('adminPhone') ?? '',
      whatsappNumber: byKey.get('whatsappNumber') ?? '',
      privacyPolicyUrl: byKey.get('privacyPolicyUrl') ?? '',
    };
  }

  async save(input: RakazSupportContact): Promise<RakazSupportContact> {
    await this.prisma.$transaction(
      KEYS.map((key) =>
        this.prisma.appSetting.upsert({
          where: { key },
          create: { key, value: input[key] },
          update: { value: input[key] },
        }),
      ),
    );
    return this.get();
  }

  async getWorkSchedule(): Promise<RakazWorkSchedule> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { in: ['workStart', 'workEnd', 'workDays'] } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const days = byKey.get('workDays');
    return {
      startTime: byKey.get('workStart') ?? DEFAULT_SCHEDULE.startTime,
      endTime: byKey.get('workEnd') ?? DEFAULT_SCHEDULE.endTime,
      days: days === undefined ? DEFAULT_SCHEDULE.days : days.split(',').filter(Boolean).map(Number),
    };
  }

  async saveWorkSchedule(schedule: RakazWorkSchedule): Promise<RakazWorkSchedule> {
    const values: Record<string, string> = {
      workStart: schedule.startTime,
      workEnd: schedule.endTime,
      workDays: [...new Set(schedule.days)].sort().join(','),
    };
    await this.prisma.$transaction(
      Object.entries(values).map(([key, value]) =>
        this.prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    );
    return this.getWorkSchedule();
  }
}
