import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { DateISO } from '../../../common/validators.js';

export class OpenDailyDto {
  @ApiProperty({ example: 'R-204' })
  @IsString()
  @MaxLength(40)
  routeId: string;

  @ApiPropertyOptional({ example: '2026-10-12' })
  @IsOptional()
  @DateISO()
  dateISO?: string;
}

export class TripsQueryDto {
  @ApiPropertyOptional({ example: '2026-10-12' })
  @IsOptional()
  @DateISO()
  dateISO?: string;
}
