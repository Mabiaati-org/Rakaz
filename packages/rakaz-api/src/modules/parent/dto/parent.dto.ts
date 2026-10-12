import { ApiProperty } from '@nestjs/swagger';
import type { RakazHandoverResult, RakazStudentAddress } from '@rakaz/contract';
import { IsBoolean, IsInt, IsLatitude, IsLongitude, IsString, MaxLength, Min } from 'class-validator';

import { Trim } from '../../../common/validators.js';

export class TodayTripsQueryDto {
  @ApiProperty({ example: 'STU-24031' })
  @IsString()
  @MaxLength(40)
  studentId: string;
}

export class UpdateAddressDto implements RakazStudentAddress {
  @ApiProperty() @Trim() @IsString() @MaxLength(80) governorate: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(120) area: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(120) neighborhood: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(160) street: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(160) landmark: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(300) accessNotes: string;

  @ApiProperty()
  @IsLatitude({ message: 'خط العرض غير صالح' })
  latitude: number;

  @ApiProperty()
  @IsLongitude({ message: 'خط الطول غير صالح' })
  longitude: number;
}

export class HandoverDto implements RakazHandoverResult {
  @ApiProperty({ example: 'TRIP-2026-10-12-R-204-AFTERNOON' })
  @IsString()
  @MaxLength(80)
  tripId: string;

  @ApiProperty({ example: 'STU-24031' })
  @IsString()
  @MaxLength(40)
  studentId: string;

  @ApiProperty()
  @IsBoolean()
  confirmed: boolean;

  @ApiProperty()
  @IsBoolean()
  issueReported: boolean;

  @ApiProperty({ description: 'Epoch ms' })
  @IsInt()
  @Min(0)
  at: number;
}
