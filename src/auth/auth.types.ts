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
