import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isPlanActive } from '../../subscription/plan-limits';
import { UserRole } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AuthUser } from '../auth.types';

// Blocks owners whose plan has expired from using "major" write features. Their
// data is untouched — they simply must re-subscribe. Admins always pass; non-
// owners are out of scope for this guard and pass through (other guards apply).
@Injectable()
export class PlanActiveGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();

    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.role !== UserRole.OWNER) return true;

    const owner = await this.usersService.findOne(user.id);
    if (!isPlanActive(owner)) {
      throw new ForbiddenException(
        'Your plan has expired. Subscribe to a plan to use this feature.',
      );
    }
    return true;
  }
}
