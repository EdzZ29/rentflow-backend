import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { Business } from '../businesses/entities/business.entity';
import { PaypalService } from '../paypal/paypal.service';
import { PlanType, User } from '../users/entities/user.entity';
import {
  businessLimitFor,
  effectivePlan,
  isPlanActive,
  isTrialActive,
  PLAN_DURATION_DAYS,
  planDaysLeft,
  trialDaysLeft,
} from './plan-limits';

const TRIAL_DAYS = 7;

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
    private readonly activity: ActivityLogService,
    private readonly paypalService: PaypalService,
  ) {}

  async activatePaypalSubscription(
    userId: number,
    subscriptionId: string,
    plan: PlanType = PlanType.MONTHLY,
  ) {
    const paypalDetails =
      await this.paypalService.verifySubscription(subscriptionId);

    if (
      paypalDetails.status !== 'ACTIVE' &&
      paypalDetails.status !== 'APPROVED'
    ) {
      throw new BadRequestException(
        paypalDetails.message ||
          `PayPal subscription status is ${paypalDetails.status}`,
      );
    }

    return this.choosePlan(userId, plan);
  }

  async getSummary(userId: number) {
    const user = await this.getUser(userId);
    const used = await this.businessesRepository.count({
      where: { ownerId: userId },
    });
    return this.buildSummary(user, used);
  }

  async startTrial(userId: number) {
    const user = await this.getUser(userId);
    if (user.plan !== PlanType.NONE) {
      throw new BadRequestException('A trial or plan is already active.');
    }
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
    user.plan = PlanType.TRIAL;
    user.trialEndsAt = trialEnds;
    user.planStartedAt = new Date();
    await this.usersRepository.save(user);
    await this.activity.safeRecord({
      userId,
      category: 'plan',
      action: 'trial_started',
      title: 'Free trial started',
      description: `Started a ${TRIAL_DAYS}-day free trial`,
    });
    return this.getSummary(userId);
  }

  async choosePlan(userId: number, plan: PlanType) {
    const user = await this.getUser(userId);
    const now = new Date();
    user.plan = plan;
    user.planStartedAt = now;
    user.trialEndsAt = null;
    // Paid plans run for a fixed period, then lapse until renewed.
    const days = PLAN_DURATION_DAYS[plan];
    if (days) {
      const ends = new Date(now);
      ends.setDate(ends.getDate() + days);
      user.planEndsAt = ends;
    } else {
      user.planEndsAt = null;
    }
    await this.usersRepository.save(user);
    await this.activity.safeRecord({
      userId,
      category: 'plan',
      action: 'changed',
      title: 'Subscription updated',
      description: `Switched to the ${plan} plan`,
    });
    return this.getSummary(userId);
  }

  private async getUser(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private buildSummary(user: User, businessesUsed: number) {
    return {
      plan: user.plan,
      effectivePlan: effectivePlan(user),
      trialEndsAt: user.trialEndsAt,
      planStartedAt: user.planStartedAt,
      planEndsAt: user.planEndsAt,
      isTrialActive: isTrialActive(user),
      trialDaysLeft: trialDaysLeft(user),
      // Can the owner use paid features right now?
      isActive: isPlanActive(user),
      planDaysLeft: planDaysLeft(user),
      businessLimit: businessLimitFor(user),
      businessesUsed,
    };
  }
}
