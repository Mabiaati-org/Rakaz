import { ApiProperty } from '@nestjs/swagger';
import type { RakazAdminDriverInput } from '@rakaz/contract';
import { IsBoolean, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

import { IraqiPhone, Trim } from '../../../common/validators.js';

export class SaveDriverDto implements RakazAdminDriverInput {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(2, { message: 'اسم السائق مطلوب' })
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '07705551234' })
  @IraqiPhone()
  phone: string;

  @ApiProperty({ example: 'باص 17' })
  @Trim()
  @IsString()
  @MinLength(1, { message: 'رقم أو اسم الباص مطلوب' })
  @MaxLength(60)
  vehicleLabel: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(60)
  plateNumber: string;

  @ApiProperty() @Trim() @IsString() @MaxLength(80) vehicleModel: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(40) vehicleColor: string;

  @ApiProperty({ nullable: true })
  @ValidateIf((o: SaveDriverDto) => o.vehicleCapacity !== null)
  @IsInt()
  @Min(1)
  @Max(100)
  vehicleCapacity: number | null;

  @ApiProperty()
  @IsBoolean()
  active: boolean;
}
