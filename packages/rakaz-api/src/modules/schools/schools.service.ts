import { Injectable } from '@nestjs/common';
import type { RakazAdminSchool, RakazAdminSchoolInput } from '@rakaz/contract';

import { ApiError } from '../../common/api-error.js';
import type { School } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export function schoolToWire(s: School): RakazAdminSchool {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    locationLabel: s.locationLabel,
    coordinate: { latitude: s.lat, longitude: s.lng },
    phone: s.phone,
    startTime: s.startTime,
    endTime: s.endTime,
  };
}

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<RakazAdminSchool[]> {
    const rows = await this.prisma.school.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
    return rows.map(schoolToWire);
  }

  async save(input: RakazAdminSchoolInput): Promise<RakazAdminSchool> {
    const data = {
      name: input.name,
      address: input.address,
      locationLabel: input.locationLabel,
      lat: input.coordinate.latitude,
      lng: input.coordinate.longitude,
      phone: input.phone,
      startTime: input.startTime,
      endTime: input.endTime,
    };
    if (input.id) {
      const existing = await this.prisma.school.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw ApiError.notFound('المدرسة غير موجودة');
      return schoolToWire(await this.prisma.school.update({ where: { id: input.id }, data }));
    }
    return schoolToWire(await this.prisma.school.create({ data }));
  }

  async remove(id: string): Promise<void> {
    const school = await this.prisma.school.findFirst({ where: { id, deletedAt: null } });
    if (!school) throw ApiError.notFound('المدرسة غير موجودة');

    const [students, routes] = await this.prisma.$transaction([
      this.prisma.student.count({ where: { schoolId: id, deletedAt: null } }),
      this.prisma.route.count({ where: { schoolId: id, deletedAt: null } }),
    ]);
    if (students > 0 || routes > 0) {
      throw ApiError.conflict('لا يمكن حذف مدرسة مرتبطة بطلاب أو مسارات. انقلهم أولاً.');
    }
    await this.prisma.school.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
