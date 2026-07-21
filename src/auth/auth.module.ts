import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthAccount } from './entities/oauth-account.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { PasswordResetService } from './password-reset.service';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([OAuthAccount, PasswordResetToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as `${number}${'d' | 'h' | 'm' | 's'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController, OAuthController],
  // GoogleStrategy/FacebookStrategy are always registered; their constructors
  // tolerate missing credentials (they use a placeholder) so the app still boots
  // for password-only setups. The provider routes simply won't work until the
  // real GOOGLE_*/FACEBOOK_* env vars are set.
  providers: [
    AuthService,
    OAuthService,
    PasswordResetService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
  ],
})
export class AuthModule {}
