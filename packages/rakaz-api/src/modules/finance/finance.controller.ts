import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAdminFinanceRow, RakazPayment, RakazSubscription } from '@rakaz/contract';

import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RecordPaymentDto, SaveSubscriptionDto } from './dto/finance.dto.js';
import { FinanceService } from './finance.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('finance')
  @ApiOperation({ summary: 'اشتراكات ومدفوعات كل الطلاب' })
  list(): Promise<RakazAdminFinanceRow[]> {
    return this.finance.listForAdmin();
  }

  @Put('students/:id/subscription')
  @ApiOperation({ summary: 'إنشاء أو تعديل اشتراك الطالب' })
  saveSubscription(@Param('id') id: string, @Body() dto: SaveSubscriptionDto): Promise<RakazSubscription> {
    return this.finance.saveSubscription(id, dto);
  }

  @Post('students/:id/payments')
  @ApiOperation({ summary: 'تسجيل دفعة للطالب' })
  recordPayment(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<RakazPayment> {
    return this.finance.recordPayment(admin, id, dto);
  }
}
