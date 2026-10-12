import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RakazAbsenceInput } from '@rakaz/contract';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { absenceReasonMap, absenceScopeMap } from '../../../common/mappers.js';
import { DateISO, Trim } from '../../../common/validators.js';

export class ReportAbsenceDto implements RakazAbsenceInput {
  @ApiProperty({ example: 'STU-24031' })
  @IsString()
  studentId: string;

  @ApiProperty({ example: '2026-10-12' })
  @DateISO()
  dateISO: string;

  @ApiProperty({ enum: absenceScopeMap.wireValues })
  @IsIn(absenceScopeMap.wireValues)
  scope: RakazAbsenceInput['scope'];

  @ApiProperty({ enum: absenceReasonMap.wireValues })
  @IsIn(absenceReasonMap.wireValues)
  reason: RakazAbsenceInput['reason'];

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(500)
  note: string;
}

export class AbsencesQueryDto {
  @ApiPropertyOptional({ example: '2026-10-12' })
  @IsOptional()
  @DateISO()
  dateISO?: string;
}
