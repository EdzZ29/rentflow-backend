import { IsIn } from 'class-validator';
import { SupportStatus } from '../entities/support-ticket.entity';

const STATUSES = Object.values(SupportStatus);

export class UpdateTicketDto {
  @IsIn(STATUSES)
  status: SupportStatus;
}
