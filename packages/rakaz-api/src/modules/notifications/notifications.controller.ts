import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazParentNotification } from '@rakaz/contract';

import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { type Paginated, PaginationDto } from '../../common/dto/pagination.dto.js';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto/register-device.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'صندوق إشعارات المستخدم الحالي' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto): Promise<Paginated<RakazParentNotification>> {
    return this.notifications.list(user.id, query);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'تعليم كل الإشعارات كمقروءة' })
  async markAllRead(@CurrentUser() user: AuthUser): Promise<null> {
    await this.notifications.markAllRead(user.id);
    return null;
  }

  @Put('devices')
  @ApiOperation({ summary: 'تسجيل الجهاز لاستقبال الإشعارات الفورية' })
  async registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto): Promise<null> {
    await this.notifications.registerDevice(user.id, dto.token, dto.platform);
    return null;
  }

  @Post('devices/unregister')
  @HttpCode(200)
  @ApiOperation({ summary: 'إلغاء تسجيل الجهاز' })
  async unregisterDevice(@CurrentUser() user: AuthUser, @Body() dto: UnregisterDeviceDto): Promise<null> {
    await this.notifications.unregisterDevice(user.id, dto.token);
    return null;
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'تعليم إشعار كمقروء' })
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<null> {
    await this.notifications.markRead(user.id, id);
    return null;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف إشعار' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<null> {
    await this.notifications.remove(user.id, id);
    return null;
  }
}
