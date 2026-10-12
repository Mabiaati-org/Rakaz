import { Injectable } from '@nestjs/common';
import type { RakazSupportContact } from '@rakaz/contract';

import { PrismaService } from '../../prisma/prisma.service.js';

const KEYS = ['adminPhone', 'whatsappNumber', 'privacyPolicyUrl'] as const satisfies ReadonlyArray<
  keyof RakazSupportContact
>;

/** Contact details shown inside the apps, editable from the dashboard. */
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
}
