import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(1, 80)
  make: string;

  @IsString()
  @Length(1, 80)
  model: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsString()
  @Length(1, 20)
  licensePlate: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  vin?: string;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsInt()
  driverId?: number;
}
