import { ApiProperty } from '@nestjs/swagger';
import type { RakazSupportContact } from '@rakaz/contract';
import { IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';

import { IraqiPhone, Trim } from '../../../common/validators.js';

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
