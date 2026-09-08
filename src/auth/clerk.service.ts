import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import type { ClerkClient } from '@clerk/backend';
import { OAuthProfile } from './auth.types';

/**
 * Turns a Clerk session token into a profile we trust.
 *
 * Two rules drive the design:
 *
 *  1. The token is verified against Clerk's signing keys before anything in it
 *     is believed. `authorizedParties` is pinned to our own frontend so a token
 *     minted for some other Clerk application can't be replayed here.
 *
 *  2. The email is read from Clerk's Backend API, never from the request body
 *     and never from the token. Clerk's default session token carries only
 *     identity claims (`sub`, `sid`, `azp`, …) — no email — and anything the
 *     browser sends alongside it is attacker-controlled. Since a verified email
 *     is what links a login to an existing Rentivo account, trusting a
 *     client-supplied one would be an account-takeover hole.
 */
@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly secretKey?: string;
  private readonly client?: ClerkClient;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('CLERK_SECRET_KEY')?.trim();
    if (this.secretKey) {
      this.client = createClerkClient({
        secretKey: this.secretKey,
        publishableKey: this.config.get<string>('CLERK_PUBLISHABLE_KEY'),
      });
    } else {
      // Don't crash the app — password and Google/Facebook login still work.
      // Only the Clerk endpoint is unavailable, and it says so when called.
      this.logger.warn(
        'CLERK_SECRET_KEY is not set — POST /auth/clerk is disabled. ' +
          'Add it from Clerk Dashboard → API keys to enable Clerk sign-in.',
      );
    }
  }

  get enabled() {
    return !!this.client;
  }

  async profileFromSessionToken(token: string): Promise<OAuthProfile> {
    if (!this.client || !this.secretKey) {
      throw new ServiceUnavailableException(
        'Clerk sign-in is not configured on this server.',
      );
    }

    // ── 1. Verify the token ────────────────────────────────
    let sub: string;
    try {
      const claims = await verifyToken(token, {
        secretKey: this.secretKey,
        authorizedParties: this.authorizedParties(),
      });
      sub = claims.sub;
    } catch (err) {
      // Expired/tampered/wrong-instance tokens all land here. Log the reason
      // for operators but tell the client nothing beyond "invalid".
      this.logger.warn(
        `Clerk token rejected: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Invalid Clerk session.');
    }

    // ── 2. Read the profile from Clerk, not from the client ─
    const user = await this.client.users.getUser(sub);

    // Prefer the primary email; fall back to any verified one.
    const primary = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    );
    const email = primary ?? user.emailAddresses[0];

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      provider: 'clerk',
      providerUserId: user.id,
      email: email?.emailAddress,
      // handleOAuthLogin refuses to link an unverified email, which is what
      // stops "sign up as victim@example.com" from taking over their account.
      emailVerified: email?.verification?.status === 'verified',
      name: fullName || user.username || undefined,
      picture: user.imageUrl || undefined,
    };
  }

  // Restrict which origins may present tokens to us. Empty means "don't check",
  // which we only allow if FRONTEND_URL isn't configured.
  private authorizedParties(): string[] | undefined {
    const raw = this.config.get<string>('CLERK_AUTHORIZED_PARTIES')
      ?? this.config.get<string>('FRONTEND_URL');
    if (!raw) return undefined;
    const parties = raw
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
    return parties.length ? parties : undefined;
  }
}
