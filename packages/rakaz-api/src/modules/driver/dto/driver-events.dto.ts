import { ApiProperty } from '@nestjs/swagger';
import { RakazActionKind, type RakazDriverEventInput, type RakazLocationPing } from '@rakaz/contract';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { GeoPointDto } from '../../../common/dto/geo-point.dto.js';

export class DriverEventDto implements RakazDriverEventInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ enum: ['morning', 'afternoon'] })
  @IsIn(['morning', 'afternoon'])
  tripKind: 'morning' | 'afternoon';

  @ApiProperty({ enum: RakazActionKind })
  @IsEnum(RakazActionKind)
  action: RakazActionKind;

  @ApiProperty({ nullable: true, example: 'STU-24031' })
  @ValidateIf((o: DriverEventDto) => o.studentId !== null)
  @IsString()
  @MaxLength(40)
  studentId: string | null;

  @ApiProperty({ description: 'Epoch ms' })
  @IsInt()
  @Min(0)
  at: number;

  @ApiProperty({ type: GeoPointDto, nullable: true })
  @ValidateIf((o: DriverEventDto) => o.location !== null)
  @ValidateNested()
  @Type(() => GeoPointDto)
  location: GeoPointDto | null;

  @ApiProperty({ nullable: true })
  @ValidateIf((o: DriverEventDto) => o.detail !== null)
  @IsString()
  @MaxLength(2000)
  detail: string | null;

  @ApiProperty({ example: 1 })
  @Equals(1)
  schemaVersion: 1;
}

export class DriverEventsDto {
  @ApiProperty({ type: [DriverEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => DriverEventDto)
  events: DriverEventDto[];
}

export class LocationPingDto extends GeoPointDto implements RakazLocationPing {
  @ApiProperty({ enum: ['morning', 'afternoon'] })
  @IsIn(['morning', 'afternoon'])
  tripKind: 'morning' | 'afternoon';

  @ApiProperty({ description: 'Epoch ms' })
  @IsInt()
  @Min(0)
  at: number;

  @ApiProperty({ nullable: true, description: 'm/s' })
  @ValidateIf((o: LocationPingDto) => o.speed !== null)
  @IsNumber()
  speed: number | null;

  @ApiProperty({ nullable: true, description: 'درجات' })
  @ValidateIf((o: LocationPingDto) => o.heading !== null)
  @IsNumber()
  heading: number | null;
}

export class LocationPingsDto {
  @ApiProperty({ type: [LocationPingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => LocationPingDto)
  pings: LocationPingDto[];
}
