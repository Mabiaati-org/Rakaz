import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type {
  RakazAbsenceReport,
  RakazParentBootstrap,
  RakazParentTripView,
  RakazStudentAddress,
  RakazSupportTicket,
  RakazTripKind,
} from '@rakaz/contract';

import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { WithMessage } from '../../common/dto/pagination.dto.js';
import { AbsencesService } from '../absences/absences.service.js';
import { ReportAbsenceDto } from '../absences/dto/report-absence.dto.js';
import { CreateTicketDto } from '../tickets/dto/ticket.dto.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { TripsService } from '../trips/trips.service.js';
import { HandoverDto, TodayTripsQueryDto, UpdateAddressDto } from './dto/parent.dto.js';
import { ParentService } from './parent.service.js';

@ApiTags('parent')
@ApiBearerAuth()
@Roles('GUARDIAN')
@Controller('parent')
export class ParentController {
  constructor(
    private readonly parent: ParentService,
    private readonly trips: TripsService,
    private readonly absences: AbsencesService,
    private readonly tickets: TicketsService,
  ) {}

  @Get('bootstrap')
  @ApiOperation({ summary: 'بيانات ولي الأمر وأبنائه واشتراكاتهم' })
  bootstrap(@CurrentUser() user: AuthUser): Promise<RakazParentBootstrap> {
    return this.parent.bootstrap(user.id);
  }

  @Get('trips/today')
  @SkipThrottle()
  @ApiOperation({ summary: 'رحلتا اليوم لأحد الأبناء مع موقع الباص الحي' })
  todayTrips(
    @CurrentUser() user: AuthUser,
    @Query() query: TodayTripsQueryDto,
  ): Promise<{ morning: RakazParentTripView; afternoon: RakazParentTripView; activeKind: RakazTripKind }> {
    return this.trips.parentToday(user, query.studentId);
  }

  @Get('absences')
  @ApiOperation({ summary: 'بلاغات الغياب الأخيرة والقادمة' })
  listAbsences(@CurrentUser() user: AuthUser): Promise<RakazAbsenceReport[]> {
    return this.absences.listForGuardian(user.id);
  }

  @Post('absences')
  @ApiOperation({ summary: 'تبليغ غياب' })
  async reportAbsence(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReportAbsenceDto,
  ): Promise<WithMessage<RakazAbsenceReport>> {
    return new WithMessage(await this.absences.report(user, dto), 'تم إرسال بلاغ الغياب');
  }

  @Delete('absences/:id')
  @ApiOperation({ summary: 'إلغاء بلاغ غياب' })
  async cancelAbsence(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<WithMessage<null>> {
    await this.absences.cancel(user, id);
    return new WithMessage(null, 'تم إلغاء بلاغ الغياب');
  }

  @Put('students/:studentId/address')
  @ApiOperation({ summary: 'تحديث عنوان المنزل' })
  async updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<WithMessage<RakazStudentAddress>> {
    return new WithMessage(await this.parent.updateAddress(user, studentId, dto), 'تم تحديث العنوان');
  }

  @Post('handovers')
  @HttpCode(200)
  @ApiOperation({ summary: 'تأكيد استلام الطالب أو الإبلاغ عن مشكلة' })
  async handover(@CurrentUser() user: AuthUser, @Body() dto: HandoverDto): Promise<null> {
    await this.trips.confirmHandover(user, dto);
    return null;
  }

  @Get('tickets')
  @ApiOperation({ summary: 'تذاكر الدعم الخاصة بولي الأمر' })
  listTickets(@CurrentUser() user: AuthUser): Promise<RakazSupportTicket[]> {
    return this.tickets.listMine(user.id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'إرسال شكوى أو ملاحظة' })
  async createTicket(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTicketDto,
  ): Promise<WithMessage<RakazSupportTicket>> {
    return new WithMessage(await this.tickets.create(user, dto), 'تم الإرسال بنجاح');
  }
}
