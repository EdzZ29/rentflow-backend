import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UserRole } from '../users/entities/user.entity';
import { ACCESS_COOKIE, accessCookieOptions } from './auth.cookie';
import { ClerkService } from './clerk.service';
import { Public } from './decorators/public.decorator';
import { ClerkSessionDto } from './dto/clerk-session.dto';
import { OAuthError, OAuthService } from './oauth.service';

// Exchanges a Clerk session for a Rentivo one.
//
// Clerk owns credentials (password, Google/Facebook, email verification, bot
// protection); Rentivo still owns authorization (role, plan, isActive). Once
// Clerk vouches for an identity, this hands off to the exact same
// link-or-create path the Google/Facebook callbacks use, and issues our normal
// httpOnly session cookie — so every existing guard and API route is unchanged.
@Public()
@Controller('auth')
export class ClerkController {
  constructor(
    private readonly clerkService: ClerkService,
    private readonly oauthService: OAuthService,
  ) {}

  // Same rate limit as /auth/login: this is an authentication entry point.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('clerk')
  async exchange(
    @Body() dto: ClerkSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = await this.clerkService.profileFromSessionToken(dto.token);

    const defaultRole =
      dto.role === 'owner' ? UserRole.OWNER : UserRole.CUSTOMER;

    try {
      const result = await this.oauthService.handleOAuthLogin(
        profile,
        defaultRole,
        dto.acceptedTerms === true,
      );
      res.cookie(ACCESS_COOKIE, result.accessToken, accessCookieOptions());
      return result;
    } catch (err) {
      if (err instanceof OAuthError) {
        // 'no_email' / 'email_unverified' — expected, and actionable by the
        // user, so surface the code rather than a generic 500.
        throw new BadRequestException(err.code);
      }
      throw err;
    }
  }
}
