import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

// Public self-registration creates a Customer or Owner account.
// (Admin accounts are never self-registered.)
export class RegisterDto {
  @IsString()
  @Length(1, 120)
  fullName: string;

  @IsEmail({}, { message: 'Enter a valid email address, e.g. you@example.com.' })
  @Length(1, 180)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must include an uppercase letter, a lowercase letter, and a number.',
  })
  password: string;

  @IsOptional()
  @IsIn([UserRole.CUSTOMER, UserRole.OWNER])
  role?: UserRole.CUSTOMER | UserRole.OWNER;
}
