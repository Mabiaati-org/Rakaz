import { ApiProperty } from '@nestjs/swagger';
import type { RakazAdminRouteInput } from '@rakaz/contract';
import { Type } from 'class-transformer';
import { IsBoolean, IsString, Matches, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';

import { GeoPointDto } from '../../../common/dto/geo-point.dto.js';
import { Trim } from '../../../common/validators.js';

export class SaveRouteDto implements RakazAdminRouteInput {
  @ApiProperty({ example: 'R-204' })
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'رمز المسار يقبل أحرفاً إنجليزية وأرقاماً وشرطة فقط' })
  id: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'اسم المسار مطلوب' })
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'اختر المدرسة' })
  schoolId: string;

  @ApiProperty({ type: GeoPointDto, nullable: true })
  @ValidateIf((o: SaveRouteDto) => o.depot !== null)
  @ValidateNested()
  @Type(() => GeoPointDto)
  depot: GeoPointDto | null;

  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class AssignDriverDto {
  @ApiProperty({ nullable: true, description: 'null لإزالة السائق من المسار' })
  @ValidateIf((o: AssignDriverDto) => o.driverUid !== null)
  @IsString()
  driverUid: string | null;
}
