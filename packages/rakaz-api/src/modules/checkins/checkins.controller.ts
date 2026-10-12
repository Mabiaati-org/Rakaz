import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RakazAdminCheckin, RakazDriverCheckin } from '@rakaz/contract';

import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CheckinsService } from './checkins.service.js';
import { CheckinDto, CheckinsQueryDto } from './dto/checkin.dto.js';

@ApiBearerAuth()
@Controller()
export class CheckinsController {
  constructor(private readonly checkins: CheckinsService) {}

  @ApiTags('driver')
  @Roles('DRIVER')
  @Post('driver/checkins')
  @ApiOperation({ summary: 'تسجيل موقع السائق ومن معه الآن (كل ٥ دقائق خلال الدوام)' })
  @ApiResponse({ status: 201, description: 'سُجّل الموقع مع قائمة الطلاب في الباص' })
  @ApiResponse({ status: 401, description: 'بدون تسجيل دخول' })
  @ApiResponse({ status: 403, description: 'الحساب ليس حساب سائق' })
  @ApiResponse({ status: 422, description: 'خارج وقت الدوام' })
  record(@CurrentUser() user: AuthUser, @Body() dto: CheckinDto): Promise<RakazDriverCheckin> {
    return this.checkins.record(user, dto);
  }

  @ApiTags('admin')
  @Roles('ADMIN')
  @Get('admin/checkins')
  @ApiOperation({ summary: 'سجل مواقع السائقين ليوم محدد (الافتراضي: اليوم)' })
  list(@Query() query: CheckinsQueryDto): Promise<RakazAdminCheckin[]> {
    return this.checkins.listForAdmin(query);
  }
}
