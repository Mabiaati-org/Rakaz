import { Injectable } from '@nestjs/common';
import type { RakazDriverBootstrap, RakazDriverRoute } from '@rakaz/contract';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { TripsService } from '../trips/trips.service.js';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly trips: TripsService,
  ) {}

  async bootstrap(driverId: string): Promise<RakazDriverBootstrap> {
    const [user, route, support, completedTripsTotal, workSchedule] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: driverId }, include: { driverProfile: true } }),
      this.prisma.route.findFirst({
        where: { driverId, deletedAt: null, active: true },
        include: {
          school: true,
          stops: { include: { student: true }, orderBy: { sequence: 'asc' } },
        },
      }),
      this.settings.get(),
      this.prisma.trip.count({ where: { driverId, phase: 'FINISHED' } }),
      this.settings.getWorkSchedule(),
    ]);

    let wireRoute: RakazDriverRoute | null = null;
    if (route) {
      const stops = route.stops.filter((s) => !s.student.deletedAt && s.student.active);
      const school = { latitude: route.school.lat, longitude: route.school.lng };
      wireRoute = {
        id: route.code,
        name: route.name,
        school: {
          id: route.school.id,
          name: route.school.name,
          address: route.school.address,
          coordinate: school,
          phone: route.school.phone,
          startTime: route.school.startTime,
        },
        depot:
          route.depotLat !== null && route.depotLng !== null
            ? { latitude: route.depotLat, longitude: route.depotLng }
            : school,
        students: stops.map(({ student }) => ({
          id: student.code,
          name: student.fullName,
          grade: student.grade,
          area: [student.area, student.neighborhood].filter(Boolean).join(' · '),
          street: [student.street, student.landmark].filter(Boolean).join(' · '),
          home: { latitude: student.homeLat, longitude: student.homeLng },
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          notes: [student.accessNotes, student.notes].filter(Boolean).join(' — ') || null,
        })),
        stops: stops.map((s) => ({
          studentId: s.student.code,
          pickupTime: s.pickupTime,
          dropoffTime: s.dropoffTime,
        })),
        updatedAt: Math.max(route.updatedAt.getTime(), ...stops.map((s) => s.updatedAt.getTime())),
      };
    }

    return {
      profile: {
        uid: user.id,
        name: user.name,
        phone: user.phone,
        vehicleLabel: user.driverProfile?.vehicleLabel ?? '',
        plateNumber: user.driverProfile?.plateNumber ?? '',
        adminPhone: support.adminPhone,
      },
      route: wireRoute,
      today: await this.trips.driverToday(route?.id ?? null),
      completedTripsTotal,
      workSchedule,
      serverTime: Date.now(),
    };
  }
}
