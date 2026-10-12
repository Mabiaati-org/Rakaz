import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAdminSchool } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { SaveSchoolDto } from './dto/save-school.dto.js';
import { SchoolsService } from './schools.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة المدارس' })
  list(): Promise<RakazAdminSchool[]> {
    return this.schools.list();
  }

  @Post()
  @ApiOperation({ summary: 'إضافة مدرسة' })
  create(@Body() dto: SaveSchoolDto): Promise<RakazAdminSchool> {
    return this.schools.save({ ...dto, id: undefined });
  }

  @Put(':id')
  @ApiOperation({ summary: 'تعديل مدرسة' })
  update(@Param('id') id: string, @Body() dto: SaveSchoolDto): Promise<RakazAdminSchool> {
    return this.schools.save({ ...dto, id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف مدرسة' })
  async remove(@Param('id') id: string): Promise<null> {
    await this.schools.remove(id);
    return null;
  }
}
