import { Module } from '@nestjs/common';

import { CheckinsController } from './checkins.controller.js';
import { CheckinsService } from './checkins.service.js';
import { GeocoderService } from './geocoder.service.js';

@Module({
  controllers: [CheckinsController],
  providers: [CheckinsService, GeocoderService],
})
export class CheckinsModule {}
