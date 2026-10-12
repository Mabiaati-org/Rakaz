import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { RakazAdminTrip, RakazTripEvent } from '@rakaz/contract';
import type { Request, Response } from 'express';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { OpenDailyDto, TripsQueryDto } from './dto/open-daily.dto.js';
import { TripsService } from './trips.service.js';

const HEARTBEAT_MS = 20_000;

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/trips')
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'رحلات يوم محدد (الافتراضي: اليوم) مع حالة كل طالب' })
  list(@Query() query: TripsQueryDto): Promise<RakazAdminTrip[]> {
    return this.trips.listAdminTrips(query.dateISO);
  }

  /** Server-sent events: pushes today's trips whenever any of them changes. */
  @Get('stream')
  @SkipThrottle()
  @SkipEnvelope()
  @ApiOperation({ summary: 'بث حي لرحلات اليوم (SSE)' })
  async stream(@Req() req: Request, @Res() res: Response): Promise<void> {
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tells nginx not to buffer the stream.
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    let closed = false;
    const send = async (): Promise<void> => {
      if (closed) return;
      try {
        res.write(`data: ${JSON.stringify(await this.trips.listAdminTrips())}\n\n`);
      } catch {
        // The next change or reconnect delivers a fresh snapshot.
      }
    };

    const subscription = this.realtime.tripsChanged$.subscribe(() => void send());
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
      closed = true;
      clearInterval(heartbeat);
      subscription.unsubscribe();
    });
    await send();
  }

  @Post('open-daily')
  @HttpCode(200)
  @ApiOperation({ summary: 'فتح رحلتي الصباح والعودة لمسار في يوم محدد' })
  openDaily(@Body() dto: OpenDailyDto): Promise<{ morningTripId: string; afternoonTripId: string }> {
    return this.trips.openDaily(dto.routeId, dto.dateISO);
  }

  @Get(':tripId/events')
  @ApiOperation({ summary: 'سجل أحداث رحلة' })
  events(@Param('tripId') tripId: string): Promise<RakazTripEvent[]> {
    return this.trips.listEvents(tripId);
  }
}
