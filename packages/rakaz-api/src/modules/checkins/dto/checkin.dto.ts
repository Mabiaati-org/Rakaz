import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RakazCheckinInput } from '@rakaz/contract';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

import { GeoPointDto } from '../../../common/dto/geo-point.dto.js';
import { DateISO } from '../../../common/validators.js';

export class CheckinDto extends GeoPointDto implements RakazCheckinInput {
  @ApiProperty({ nullable: true, description: 'دقة الموقع بالمتر' })
  @ValidateIf((o: CheckinDto) => o.accuracy !== null)
  @IsNumber()
  @Min(0)
  @Max(100_000)
  accuracy: number | null;
}

export class CheckinsQueryDto {
  @ApiPropertyOptional({ example: '2026-10-12' })
  @IsOptional()
  @DateISO()
  dateISO?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  driverUid?: string;
}
