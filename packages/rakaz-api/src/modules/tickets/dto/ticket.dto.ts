import { ApiProperty } from '@nestjs/swagger';
import type { RakazSupportTicketInput, RakazTicketStatus } from '@rakaz/contract';
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

import { ticketKindMap, ticketStatusMap, ticketTopicMap } from '../../../common/mappers.js';
import { Trim } from '../../../common/validators.js';

export class CreateTicketDto implements RakazSupportTicketInput {
  @ApiProperty({ enum: ticketKindMap.wireValues })
  @IsIn(ticketKindMap.wireValues)
  kind: RakazSupportTicketInput['kind'];

  @ApiProperty({ enum: ticketTopicMap.wireValues })
  @IsIn(ticketTopicMap.wireValues)
  topic: RakazSupportTicketInput['topic'];

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(5, { message: 'اكتب تفاصيل أكثر (٥ أحرف على الأقل)' })
  @MaxLength(500)
  body: string;
}

export class UpdateTicketDto {
  @ApiProperty({ enum: ticketStatusMap.wireValues })
  @IsIn(ticketStatusMap.wireValues)
  status: RakazTicketStatus;

  @ApiProperty({ nullable: true })
  @ValidateIf((o: UpdateTicketDto) => o.adminReply !== null)
  @Trim()
  @IsString()
  @MaxLength(1000)
  adminReply: string | null;
}
