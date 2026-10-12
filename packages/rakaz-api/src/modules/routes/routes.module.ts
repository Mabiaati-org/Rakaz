import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { RoutesController } from './routes.controller.js';
import { RoutesService } from './routes.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
