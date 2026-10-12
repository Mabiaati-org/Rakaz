import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RakazAdminSchoolInput } from '@rakaz/contract';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { GeoPointDto } from '../../../common/dto/geo-point.dto.js';
import { TimeOfDay, Trim } from '../../../common/validators.js';

export class SaveSchoolDto implements RakazAdminSchoolInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'اسم المدرسة مطلوب' })
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(250)
  address: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(150)
  locationLabel: string;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  coordinate: GeoPointDto;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ example: '07:45' })
  @TimeOfDay()
  startTime: string;

  @ApiProperty({ example: '13:15' })
  @TimeOfDay()
  endTime: string;
}
