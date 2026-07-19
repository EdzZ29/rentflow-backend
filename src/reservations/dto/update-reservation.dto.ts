import { IsEnum } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto {
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
