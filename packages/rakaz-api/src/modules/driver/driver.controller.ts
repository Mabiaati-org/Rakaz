import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { RakazAbsenceReport, RakazDriverBootstrap } from '@rakaz/contract';

import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AbsencesService } from '../absences/absences.service.js';
import { TripsService } from '../trips/trips.service.js';
import { DriverService } from './driver.service.js';
import { DriverEventsDto, LocationPingsDto } from './dto/driver-events.dto.js';

@ApiTags('driver')
@ApiBearerAuth()
@Roles('DRIVER')
@Controller('driver')
export class DriverController {
  constructor(
    private readonly driver: DriverService,
    private readonly trips: TripsService,
    private readonly absences: AbsencesService,
  ) {}

  @Get('bootstrap')
  @ApiOperation({ summary: 'بيانات السائق ومساره وحالة رحلات اليوم' })
  bootstrap(@CurrentUser() user: AuthUser): Promise<RakazDriverBootstrap> {
    return this.driver.bootstrap(user.id);
  }

  @Post('events')
  @HttpCode(200)
  @ApiOperation({ summary: 'رفع أحداث الرحلة (آمن لإعادة الإرسال)' })
  events(@CurrentUser() user: AuthUser, @Body() dto: DriverEventsDto): Promise<{ accepted: number; duplicates: number }> {
    return this.trips.applyDriverEvents(user, dto.events);
  }

  @Post('location')
  @HttpCode(200)
  @SkipThrottle()
  @ApiOperation({ summary: 'رفع مواقع الباص أثناء الرحلة' })
  location(@CurrentUser() user: AuthUser, @Body() dto: LocationPingsDto): Promise<{ stored: number }> {
    return this.trips.recordLocations(user, dto.pings);
  }

  @Get('absences/today')
  @ApiOperation({ summary: 'بلاغات غياب اليوم لطلاب مسار السائق' })
  absencesToday(@CurrentUser() user: AuthUser): Promise<RakazAbsenceReport[]> {
    return this.absences.listTodayForDriver(user.id);
  }
}
