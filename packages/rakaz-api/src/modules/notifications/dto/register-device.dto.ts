import { ApiProperty } from '@nestjs/swagger';
import type { RakazDeviceRegistration, RakazNotificationKind, RakazNotificationPreferences } from '@rakaz/contract';
import { ArrayMaxSize, IsArray, IsIn, IsString, Matches, MaxLength } from 'class-validator';

import { notificationKindMap } from '../../../common/mappers.js';

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

export class NotificationPreferencesDto implements RakazNotificationPreferences {
  @ApiProperty({ enum: notificationKindMap.wireValues, isArray: true })
  @IsArray()
  @ArrayMaxSize(notificationKindMap.wireValues.length)
  @IsIn(notificationKindMap.wireValues, { each: true })
  muted: RakazNotificationKind[];
}
