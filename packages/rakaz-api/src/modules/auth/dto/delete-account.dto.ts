import { ApiProperty } from '@nestjs/swagger';
import type { RakazDeleteAccountRequest } from '@rakaz/contract';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteAccountDto implements RakazDeleteAccountRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'أدخل كلمة المرور لتأكيد الحذف' })
  @MaxLength(128)
  password: string;
}
