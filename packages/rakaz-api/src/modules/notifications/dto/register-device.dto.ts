import { ApiProperty } from '@nestjs/swagger';
import type { RakazDeviceRegistration } from '@rakaz/contract';
import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

export class RegisterDeviceDto implements RakazDeviceRegistration {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(255)
  @Matches(/^Expo(nent)?PushToken\[.+\]$/, { message: 'رمز الإشعارات غير صالح' })
  token: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'] })
  @IsIn(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';
}

export class UnregisterDeviceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  token: string;
}
