import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';

// Builds a guard for an OAuth strategy that adds CSRF protection via the OAuth
// `state` parameter, without needing server-side sessions:
//   • On the initiate leg we mint a random `state`, drop it in a short-lived
//     httpOnly cookie, and send it to the provider.
//   • On the callback leg we require the returned `state` to equal the cookie.
// A failure/cancel does NOT throw — handleRequest returns null so the controller
// can redirect the user back to the login page with a friendly message.
export function OAuthGuard(strategy: string): Type<CanActivate> {
  const cookieName = `oauth_state_${strategy}`;

  @Injectable()
  class Guard extends AuthGuard(strategy) {
    getAuthenticateOptions(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<Request>();
      // Only the initiate leg (no ?code / ?error yet) mints fresh state.
      if (!req.query.code && !req.query.error) {
        const res = context.switchToHttp().getResponse<Response>();
        const state = randomBytes(16).toString('hex');
        res.cookie(cookieName, state, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 10 * 60 * 1000, // 10 minutes to complete the flow
        });
        return { state };
      }
      return {};
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<Request>();
      const res = context.switchToHttp().getResponse<Response>();

      // On the callback leg, verify state before trusting the provider's code.
      if (req.query.code) {
        const cookieState = (req.cookies as Record<string, string>)?.[cookieName];
        res.clearCookie(cookieName, { path: '/' });
        if (!cookieState || cookieState !== req.query.state) {
          // Leave req.user unset → controller redirects with an error.
          return true;
        }
      }
      try {
        return (await super.canActivate(context)) as boolean;
      } catch {
        // Provider/library errors shouldn't 500 — let the controller redirect.
        return true;
      }
    }

    // Never throw on cancel/failure; the controller inspects req.user.
    handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
      return (user || null) as TUser;
    }
  }

  return mixin(Guard);
}
