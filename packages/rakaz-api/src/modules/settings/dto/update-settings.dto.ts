import { ApiProperty } from '@nestjs/swagger';
import type { RakazSupportContact, RakazWorkSchedule } from '@rakaz/contract';
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

import { IraqiPhone, TimeOfDay, Trim } from '../../../common/validators.js';

export class UpdateSettingsDto implements RakazSupportContact {
  @ApiProperty({ example: '07801112233' })
  @IraqiPhone()
  adminPhone: string;

  @ApiProperty({ example: '9647801112233', description: 'أرقام فقط مع رمز الدولة' })
  @Trim()
  @IsString()
  @Matches(/^\d{8,15}$/, { message: 'رقم واتساب يجب أن يكون أرقاماً فقط مع رمز الدولة' })
  whatsappNumber: string;

  @ApiProperty({ example: 'https://example.com/privacy.html' })
  @Trim()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o: UpdateSettingsDto) => o.privacyPolicyUrl !== '')
  @IsUrl({ require_protocol: true }, { message: 'رابط سياسة الخصوصية غير صالح' })
  privacyPolicyUrl: string;
}

export class WorkScheduleDto implements RakazWorkSchedule {
  @ApiProperty({ example: '06:00' })
  @TimeOfDay()
  startTime: string;

  @ApiProperty({ example: '15:00' })
  @TimeOfDay()
  endTime: string;

  @ApiProperty({ type: [Number], example: [0, 1, 2, 3, 4], description: '0 = الأحد … 6 = السبت' })
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days: number[];
}
