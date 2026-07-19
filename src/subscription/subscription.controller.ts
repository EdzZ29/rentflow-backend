import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ChoosePlanDto } from './dto/choose-plan.dto';
import { SubscriptionService } from './subscription.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller('owner/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  getSummary(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getSummary(user.id);
  }

  @Post('trial')
  startTrial(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.startTrial(user.id);
  }

  @Post()
  choosePlan(@Body() dto: ChoosePlanDto, @CurrentUser() user: AuthUser) {
    return this.subscriptionService.choosePlan(user.id, dto.plan);
  }
}
