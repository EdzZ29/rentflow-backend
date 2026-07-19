import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { BookingType } from '../entities/reservation.entity';

export class CreateReservationDto {
  @IsInt()
  productId: number;

  // Book (rent now) or reserve (hold for later).
  @IsIn([BookingType.BOOK, BookingType.RESERVE])
  type: BookingType;

  @IsDateString({}, { message: 'Start date must be a valid date.' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date.' })
  endDate: string;

  // Validity info.
  @IsString()
  @Length(3, 40, { message: 'Please provide a valid contact number.' })
  contactPhone: string;

  @IsIn(['card', 'gcash', 'paypal'])
  paymentMethod: string;

  // Consent — must be true.
  @IsBoolean()
  agreedToTerms: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
