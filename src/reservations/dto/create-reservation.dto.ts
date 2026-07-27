import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { BookingType, HandoverMode } from '../entities/reservation.entity';
import { CategoryDetailsDto } from './category-details.dto';

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

  // What the renter needs the item for.
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  purpose?: string;

  // Category-specific answers. Routed to the matching detail table by the
  // service — see CategoryDetailsDto.
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryDetailsDto)
  categoryDetails?: CategoryDetailsDto;

  // The renter's choice: collect it themselves, or have it dropped off.
  @IsOptional()
  @IsIn([HandoverMode.PICKUP, HandoverMode.DROPOFF])
  handoverMode?: HandoverMode;

  // Which ID the renter will present as proof.
  @IsOptional()
  @IsString()
  @Length(0, 60)
  validIdType?: string;

  // Handover details: where the item is collected or dropped off, and when.
  @IsOptional()
  @IsString()
  @Length(0, 200)
  pickupLocation?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  dropoffLocation?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Pick-up time must be in HH:MM format.',
  })
  pickupTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Drop-off time must be in HH:MM format.',
  })
  dropoffTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
