import { Global, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { AbsencesController } from './absences.controller.js';
import { AbsencesService } from './absences.service.js';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [AbsencesController],
  providers: [AbsencesService],
  exports: [AbsencesService],
})
export class AbsencesModule {}
