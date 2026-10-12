import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { ParentController } from './parent.controller.js';
import { ParentService } from './parent.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
