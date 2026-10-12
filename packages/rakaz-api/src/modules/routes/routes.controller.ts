import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAdminRoute } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { AssignDriverDto, SaveRouteDto } from './dto/save-route.dto.js';
import { RoutesService } from './routes.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/routes')
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة المسارات مع محطاتها' })
  list(): Promise<RakazAdminRoute[]> {
    return this.routes.list();
  }

  @Post()
  @ApiOperation({ summary: 'إضافة مسار' })
  create(@Body() dto: SaveRouteDto): Promise<RakazAdminRoute> {
    return this.routes.save(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'تعديل مسار' })
  update(@Param('id') id: string, @Body() dto: SaveRouteDto): Promise<RakazAdminRoute> {
    return this.routes.save({ ...dto, id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف مسار' })
  async remove(@Param('id') id: string): Promise<null> {
    await this.routes.remove(id);
    return null;
  }

  @Put(':id/driver')
  @ApiOperation({ summary: 'إسناد سائق للمسار أو إزالته' })
  async assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto): Promise<null> {
    await this.routes.assignDriver(id, dto.driverUid);
    return null;
  }
}
