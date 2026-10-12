import { Global, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { FinanceController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
