import { UserRole } from '../users/entities/user.entity';

/** Shape of the JWT payload we sign. */
export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

/** The authenticated principal attached to each request. */
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

/** Normalized profile returned by an OAuth strategy's validate(). */
export interface OAuthProfile {
  // 'clerk' is not a passport strategy — it's the Clerk-hosted identity layer,
  // which resolves to a Rentivo user through the same link-or-create path.
  provider: 'google' | 'facebook' | 'clerk';
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}
