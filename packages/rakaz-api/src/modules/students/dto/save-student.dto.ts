import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RakazAdminStudentInput } from '@rakaz/contract';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { GeoPointDto } from '../../../common/dto/geo-point.dto.js';
import { IraqiPhone, TimeOfDay, Trim } from '../../../common/validators.js';

export class SaveStudentDto implements RakazAdminStudentInput {
  @ApiPropertyOptional({ example: 'STU-24031', description: 'يُولَّد تلقائياً عند الإضافة إذا تُرك فارغاً' })
  @IsOptional()
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,30}$/, { message: 'رمز الطالب يقبل أحرفاً إنجليزية وأرقاماً وشرطة فقط' })
  id?: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(40)
  internalNumber: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'اسم الطالب مطلوب' })
  @MaxLength(120)
  fullName: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'الاسم الأول مطلوب' })
  @MaxLength(60)
  firstName: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(60)
  grade: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(60)
  stage: string;

  @ApiProperty({ enum: ['male', 'female'], nullable: true })
  @ValidateIf((o: SaveStudentDto) => o.gender !== null)
  @IsIn(['male', 'female'])
  gender: 'male' | 'female' | null;

  @ApiProperty({ nullable: true, description: 'Epoch ms' })
  @ValidateIf((o: SaveStudentDto) => o.birthDate !== null)
  @IsInt()
  birthDate: number | null;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'اختر المدرسة' })
  schoolId: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'اسم ولي الأمر مطلوب' })
  @MaxLength(120)
  guardianName: string;

  @ApiProperty({ example: '07701234567' })
  @IraqiPhone()
  guardianPhone: string;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  home: GeoPointDto;

  @ApiProperty() @Trim() @IsString() @MaxLength(80) governorate: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(120) area: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(120) neighborhood: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(160) street: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(160) landmark: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(300) accessNotes: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(1000) notes: string;

  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class AssignStudentRouteDto {
  @ApiProperty({ nullable: true, example: 'R-204', description: 'null لإزالة الطالب من مساره' })
  @ValidateIf((o: AssignStudentRouteDto) => o.routeId !== null)
  @IsString()
  routeId: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({ example: '07:00' })
  @IsOptional()
  @TimeOfDay()
  pickupTime?: string;

  @ApiPropertyOptional({ example: '13:30' })
  @IsOptional()
  @TimeOfDay()
  dropoffTime?: string;
}
