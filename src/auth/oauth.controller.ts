import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ACCESS_COOKIE, accessCookieOptions } from './auth.cookie';
import { OAuthProfile } from './auth.types';
import { Public } from './decorators/public.decorator';
import { OAuthGuard } from './guards/oauth.guard';
import { OAuthError, OAuthService } from './oauth.service';

@Public()
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
  ) {}

  // ── Google ────────────────────────────────────────────
  @Get('google')
  @UseGuards(OAuthGuard('google'))
  googleAuth() {
    // The guard redirects to Google; this body never runs.
  }

  @Get('google/callback')
  @UseGuards(OAuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.finish(req, res);
  }

  // ── Facebook ──────────────────────────────────────────
  @Get('facebook')
  @UseGuards(OAuthGuard('facebook'))
  facebookAuth() {
    // The guard redirects to Facebook.
  }

  @Get('facebook/callback')
  @UseGuards(OAuthGuard('facebook'))
  facebookCallback(@Req() req: Request, @Res() res: Response) {
    return this.finish(req, res);
  }

  // Shared completion: set our session cookie and redirect to the SPA, or
  // redirect back to /login with an error code the frontend can explain.
  private async finish(req: Request, res: Response) {
    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    // User cancelled, or the state/handshake failed (req.user never set).
    const profile = req.user as OAuthProfile | undefined;
    if (!profile) {
      const code = req.query.error === 'access_denied' ? 'cancelled' : 'oauth_failed';
      return res.redirect(`${frontend}/login?error=${code}`);
    }

    try {
      const result = await this.oauthService.handleOAuthLogin(profile);
      res.cookie(ACCESS_COOKIE, result.accessToken, accessCookieOptions());
      return res.redirect(`${frontend}/oauth/callback`);
    } catch (err) {
      const code = err instanceof OAuthError ? err.code : 'oauth_failed';
      return res.redirect(`${frontend}/login?error=${code}`);
    }
  }
}
