import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @Length(1, 120)
  fullName: string;

  @IsEmail()
  @Length(1, 180)
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Set by the sign-up form's consent box. Recorded as a timestamp plus policy
  // version on the user rather than kept as a bare flag.
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}
