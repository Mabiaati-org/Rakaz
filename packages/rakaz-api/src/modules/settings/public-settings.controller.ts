import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazSupportContact } from '@rakaz/contract';

import { Public } from '../../common/decorators/public.decorator.js';
import { SettingsService } from './settings.service.js';

@ApiTags('public')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'بيانات التواصل ورابط سياسة الخصوصية (بدون تسجيل دخول)' })
  get(): Promise<RakazSupportContact> {
    return this.settings.get();
  }
}
