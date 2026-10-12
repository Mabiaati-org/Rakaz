import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazAdminDriver, RakazAdminDriverResult } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { DriversService } from './drivers.service.js';
import { SaveDriverDto } from './dto/save-driver.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة السائقين' })
  list(): Promise<RakazAdminDriver[]> {
    return this.drivers.list();
  }

  @Post()
  @ApiOperation({ summary: 'إضافة سائق وإصدار كلمة مرور مؤقتة له' })
  create(@Body() dto: SaveDriverDto): Promise<RakazAdminDriverResult> {
    return this.drivers.create(dto);
  }

  @Put(':uid')
  @ApiOperation({ summary: 'تعديل سائق' })
  update(@Param('uid') uid: string, @Body() dto: SaveDriverDto): Promise<RakazAdminDriverResult> {
    return this.drivers.update(uid, dto);
  }

  @Delete(':uid')
  @ApiOperation({ summary: 'حذف سائق' })
  async remove(@Param('uid') uid: string): Promise<null> {
    await this.drivers.remove(uid);
    return null;
  }
}
