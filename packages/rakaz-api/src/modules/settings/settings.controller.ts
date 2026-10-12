import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazSupportContact } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'بيانات التواصل الظاهرة في التطبيقات' })
  get(): Promise<RakazSupportContact> {
    return this.settings.get();
  }

  @Put()
  @ApiOperation({ summary: 'تحديث بيانات التواصل' })
  save(@Body() dto: UpdateSettingsDto): Promise<RakazSupportContact> {
    return this.settings.save(dto);
  }
}
