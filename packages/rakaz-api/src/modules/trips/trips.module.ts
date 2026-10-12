import { Global, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
