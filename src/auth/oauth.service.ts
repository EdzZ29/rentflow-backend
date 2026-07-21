import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { OAuthProfile } from './auth.types';
import { OAuthAccount } from './entities/oauth-account.entity';

export type OAuthErrorCode = 'no_email' | 'email_unverified';

// Thrown for expected, user-facing OAuth problems so the controller can map
// them to a friendly redirect instead of a 500.
export class OAuthError extends Error {
  constructor(readonly code: OAuthErrorCode) {
    super(code);
  }
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly oauthAccounts: Repository<OAuthAccount>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // Resolve a social profile to a RentFlow session, creating/linking as needed.
  async handleOAuthLogin(profile: OAuthProfile) {
    if (!profile.email) {
      throw new OAuthError('no_email');
    }
    // Never auto-link on an unverified email — that would allow account takeover.
    if (!profile.emailVerified) {
      throw new OAuthError('email_unverified');
    }

    // 1) This exact identity is already linked → log that user in.
    const linked = await this.oauthAccounts.findOne({
      where: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    });

    let user;
    if (linked) {
      user = await this.usersService.findOne(linked.userId);
    } else {
      // 2) A user with this (verified) email exists → link this new provider.
      user = await this.usersService.findByEmail(profile.email);
      if (!user) {
        // 3) Brand-new user → create one. A random password is set; they can
        //    choose a real one later via "forgot password". Social sign-ups
        //    default to the customer role.
        user = await this.usersService.create({
          fullName: profile.name || profile.email.split('@')[0],
          email: profile.email,
          password: randomBytes(24).toString('hex'),
          role: UserRole.CUSTOMER,
        });
      }
      await this.oauthAccounts.save(
        this.oauthAccounts.create({
          userId: user.id,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
        }),
      );
    }

    // Backfill a profile picture if we don't have one yet.
    if (profile.picture && !user.avatarUrl) {
      user = await this.usersService.setAvatar(user.id, profile.picture);
    }

    // Always issue OUR OWN session — the provider's token is never reused.
    return this.authService.issueAuthResponse(user);
  }
}
