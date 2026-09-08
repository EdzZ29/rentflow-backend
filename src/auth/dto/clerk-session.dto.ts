import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ClerkSessionDto {
  // A Clerk session JWT obtained in the browser via `getToken()`. Verified
  // server-side against Clerk's signing keys before anything in it is used.
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  token!: string;

  // Which kind of account to create, from the "renter or business owner?" step
  // of signup. Only applied when the user does not exist yet — see
  // OAuthService.handleOAuthLogin. 'admin' is intentionally not accepted.
  @IsOptional()
  @IsIn(['owner', 'customer'])
  role?: 'owner' | 'customer';

  // Consent ticked on the sign-up form. Only applied when the account is being
  // created for the first time, alongside `role`.
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}
