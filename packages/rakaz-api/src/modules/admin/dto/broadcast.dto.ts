import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RakazBroadcastInput } from '@rakaz/contract';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../../common/validators.js';

export class BroadcastDto implements RakazBroadcastInput {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'عنوان الإشعار مطلوب' })
  @MaxLength(120)
  title: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'نص الإشعار مطلوب' })
  @MaxLength(600)
  body: string;

  @ApiProperty({ enum: ['guardians', 'drivers', 'everyone'] })
  @IsIn(['guardians', 'drivers', 'everyone'])
  audience: RakazBroadcastInput['audience'];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  studentIds?: string[];

  @ApiPropertyOptional({ example: 'R-204' })
  @IsOptional()
  @IsString()
  routeId?: string;
}
