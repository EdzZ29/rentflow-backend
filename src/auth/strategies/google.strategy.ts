import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuthProfile } from '../auth.types';

// passport-google-oauth20 performs the authorization-code exchange and profile
// fetch on the SERVER using the client secret — the browser never sees a token.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      // Placeholders keep passport-oauth2 from throwing when unconfigured; the
      // /auth/google routes only work once real credentials are set.
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL: config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:5000/api/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const json = profile._json as { email_verified?: boolean };
    const result: OAuthProfile = {
      provider: 'google',
      providerUserId: profile.id,
      email: profile.emails?.[0]?.value,
      // Google explicitly reports whether the email is verified.
      emailVerified: json.email_verified === true,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
    };
    done(null, result);
  }
}
