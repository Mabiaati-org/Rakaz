import { ApiProperty } from '@nestjs/swagger';
import type { RakazLoginRequest } from '@rakaz/contract';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { IraqiPhone } from '../../../common/validators.js';

export class LoginDto implements RakazLoginRequest {
  @ApiProperty({ example: '07701234567' })
  @IraqiPhone()
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'أدخل كلمة المرور' })
  @MaxLength(128)
  password: string;
}
