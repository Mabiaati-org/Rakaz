import { ApiProperty } from '@nestjs/swagger';
import type { RakazRefreshRequest } from '@rakaz/contract';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto implements RakazRefreshRequest {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  refreshToken: string;
}
