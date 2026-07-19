import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../auth.types';

/** Extract the authenticated user (attached by JwtStrategy) from the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
