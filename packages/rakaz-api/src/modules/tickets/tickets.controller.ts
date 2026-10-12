import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RakazSupportTicket } from '@rakaz/contract';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { UpdateTicketDto } from './dto/ticket.dto.js';
import { TicketsService } from './tickets.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'كل تذاكر الدعم' })
  list(): Promise<RakazSupportTicket[]> {
    return this.tickets.listForAdmin();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث حالة تذكرة أو الرد عليها' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto): Promise<RakazSupportTicket> {
    return this.tickets.update(id, dto);
  }
}
