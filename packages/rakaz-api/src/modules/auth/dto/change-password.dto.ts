import { ApiProperty } from '@nestjs/swagger';
import { RAKAZ_MIN_PASSWORD_LENGTH, type RakazChangePasswordRequest } from '@rakaz/contract';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto implements RakazChangePasswordRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'أدخل كلمة المرور الحالية' })
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ minLength: RAKAZ_MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(RAKAZ_MIN_PASSWORD_LENGTH, { message: `كلمة المرور يجب ألا تقل عن ${RAKAZ_MIN_PASSWORD_LENGTH} أحرف` })
  @MaxLength(128)
  @Matches(/^(?=.*\p{L})(?=.*\d).+$/u, { message: 'كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل' })
  newPassword: string;
}
