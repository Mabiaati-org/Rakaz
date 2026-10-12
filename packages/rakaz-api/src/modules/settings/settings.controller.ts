import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazSupportContact, RakazWorkSchedule } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { UpdateSettingsDto, WorkScheduleDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'بيانات التواصل الظاهرة في التطبيقات' })
  get(): Promise<RakazSupportContact> {
    return this.settings.get();
  }

  @Put('settings')
  @ApiOperation({ summary: 'تحديث بيانات التواصل' })
  save(@Body() dto: UpdateSettingsDto): Promise<RakazSupportContact> {
    return this.settings.save(dto);
  }

  @Get('work-schedule')
  @ApiOperation({ summary: 'أوقات دوام السائقين' })
  getWorkSchedule(): Promise<RakazWorkSchedule> {
    return this.settings.getWorkSchedule();
  }

  @Put('work-schedule')
  @ApiOperation({ summary: 'تحديث أوقات دوام السائقين' })
  saveWorkSchedule(@Body() dto: WorkScheduleDto): Promise<RakazWorkSchedule> {
    return this.settings.saveWorkSchedule(dto);
  }
}
