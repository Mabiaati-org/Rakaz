import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAdminGuardian, RakazAdminOverview, RakazIssuedCredentials } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { WithMessage } from '../../common/dto/pagination.dto.js';
import { AccountsService } from '../auth/accounts.service.js';
import { AdminService } from './admin.service.js';
import { BroadcastDto } from './dto/broadcast.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'عدّادات النظرة العامة' })
  overview(): Promise<RakazAdminOverview> {
    return this.admin.overview();
  }

  @Get('guardians')
  @ApiOperation({ summary: 'حسابات أولياء الأمور' })
  guardians(): Promise<RakazAdminGuardian[]> {
    return this.admin.listGuardians();
  }

  @Post('users/:uid/reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'إصدار كلمة مرور مؤقتة جديدة لحساب' })
  async resetPassword(@Param('uid') uid: string): Promise<WithMessage<RakazIssuedCredentials>> {
    return new WithMessage(await this.accounts.resetPassword(uid), 'تم إصدار كلمة مرور مؤقتة');
  }

  @Post('broadcast')
  @HttpCode(200)
  @ApiOperation({ summary: 'إرسال إشعار إداري لأولياء الأمور أو السائقين' })
  broadcast(@Body() dto: BroadcastDto): Promise<{ recipients: number }> {
    return this.admin.broadcast(dto);
  }
}
