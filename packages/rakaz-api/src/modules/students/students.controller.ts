import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAdminStudent, RakazAdminStudentResult } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { AssignStudentRouteDto, SaveStudentDto } from './dto/save-student.dto.js';
import { StudentsService } from './students.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة الطلاب' })
  list(): Promise<RakazAdminStudent[]> {
    return this.students.list();
  }

  @Post()
  @ApiOperation({ summary: 'إضافة طالب (وينشئ حساب ولي الأمر إن لم يكن موجوداً)' })
  create(@Body() dto: SaveStudentDto): Promise<RakazAdminStudentResult> {
    return this.students.save(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'تعديل طالب' })
  update(@Param('id') id: string, @Body() dto: SaveStudentDto): Promise<RakazAdminStudentResult> {
    return this.students.save({ ...dto, id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف طالب' })
  async remove(@Param('id') id: string): Promise<null> {
    await this.students.remove(id);
    return null;
  }

  @Put(':id/route')
  @ApiOperation({ summary: 'إسناد الطالب إلى مسار أو إزالته منه' })
  async assignRoute(@Param('id') id: string, @Body() dto: AssignStudentRouteDto): Promise<null> {
    await this.students.assignRoute(id, dto.routeId, dto);
    return null;
  }
}
