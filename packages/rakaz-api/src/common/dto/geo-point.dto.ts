import { ApiProperty } from '@nestjs/swagger';
import type { RakazGeoPoint } from '@rakaz/contract';
import { IsLatitude, IsLongitude } from 'class-validator';

export class GeoPointDto implements RakazGeoPoint {
  @ApiProperty({ example: 30.5156 })
  @IsLatitude({ message: 'خط العرض غير صالح' })
  latitude: number;

  @ApiProperty({ example: 47.8125 })
  @IsLongitude({ message: 'خط الطول غير صالح' })
  longitude: number;
}
