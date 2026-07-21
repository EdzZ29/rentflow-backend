import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

// An owner (or admin) manually recording a booking for a walk-in/offline
// customer. The customer is resolved/created by email on the server.
export class CreateOwnerBookingDto {
  @IsInt()
  productId: number;

  @IsString()
  @Length(1, 120)
  customerName: string;

  @IsEmail({}, { message: 'Enter a valid customer email.' })
  customerEmail: string;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  customerPhone?: string;

  @IsDateString({}, { message: 'Start date must be a valid date.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date.' })
  endDate: string;

  // Owner-created bookings default to confirmed; pending is allowed too.
  @IsOptional()
  @IsIn(['pending', 'confirmed'])
  status?: 'pending' | 'confirmed';

  @IsOptional()
  @IsString()
  note?: string;
}
