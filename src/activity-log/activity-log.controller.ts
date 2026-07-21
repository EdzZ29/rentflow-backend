import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ActivityLogService } from './activity-log.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller('owner/activity')
export class ActivityLogController {
  constructor(private readonly activity: ActivityLogService) {}

  // GET /api/owner/activity?category=&action=&q=&from=&to=
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.activity.list(user.id, { category, action, q, from, to });
  }
}
