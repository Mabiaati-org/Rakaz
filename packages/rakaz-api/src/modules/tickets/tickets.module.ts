import { Global, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
