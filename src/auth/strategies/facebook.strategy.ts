import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { OAuthProfile } from '../auth.types';

// passport-facebook exchanges the code + fetches the profile server-side using
// the app secret. Facebook only returns an email that the user has confirmed,
// and only if they granted the `email` permission (they may not have one).
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    super({
      // Placeholders keep passport-oauth2 from throwing when unconfigured; the
      // /auth/facebook routes only work once real credentials are set.
      clientID: config.get<string>('FACEBOOK_APP_ID') || 'not-configured',
      clientSecret: config.get<string>('FACEBOOK_APP_SECRET') || 'not-configured',
      callbackURL: config.get<string>(
        'FACEBOOK_CALLBACK_URL',
        'http://localhost:5000/api/auth/facebook/callback',
      ),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: OAuthProfile) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    const result: OAuthProfile = {
      provider: 'facebook',
      providerUserId: profile.id,
      email,
      // Facebook does not return an unverified email — presence implies verified.
      emailVerified: !!email,
      name:
        profile.displayName ||
        [profile.name?.givenName, profile.name?.familyName]
          .filter(Boolean)
          .join(' '),
      picture: profile.photos?.[0]?.value,
    };
    done(null, result);
  }
}
