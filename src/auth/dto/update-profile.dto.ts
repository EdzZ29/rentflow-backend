import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

// Self-service profile update for the authenticated user. Deliberately narrow —
// role, plan, and isActive are NOT editable here (the ValidationPipe strips and
// rejects anything not listed), so users can't escalate their own privileges.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password?: string;
}
