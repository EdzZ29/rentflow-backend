import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DriverStatus } from '../entities/driver.entity';

export class CreateDriverDto {
  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;

  @IsEmail()
  @Length(1, 180)
  email: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  phone?: string;

  @IsString()
  @Length(1, 60)
  licenseNumber: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}
