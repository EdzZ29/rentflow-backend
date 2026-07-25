import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { SupportCategory } from '../entities/support-ticket.entity';

const CATEGORIES = Object.values(SupportCategory);

export class CreateTicketDto {
  @IsString()
  @Length(3, 160)
  subject: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: SupportCategory;

  // The first message of the conversation.
  @IsString()
  @Length(1, 4000)
  message: string;
}
