import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAbsenceReport } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { AbsencesService } from './absences.service.js';
import { AbsencesQueryDto } from './dto/report-absence.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/absences')
export class AbsencesController {
  constructor(private readonly absences: AbsencesService) {}

  @Get()
  @ApiOperation({ summary: 'بلاغات الغياب ليوم محدد (الافتراضي: اليوم)' })
  list(@Query() query: AbsencesQueryDto): Promise<RakazAbsenceReport[]> {
    return this.absences.listForAdmin(query.dateISO);
  }
}
