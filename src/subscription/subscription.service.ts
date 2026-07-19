import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/entities/business.entity';
import { PlanType, User } from '../users/entities/user.entity';
import {
  businessLimitFor,
  effectivePlan,
  isTrialActive,
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
  ) {}

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
    return this.getSummary(userId);
  }

  async choosePlan(userId: number, plan: PlanType) {
    const user = await this.getUser(userId);
    user.plan = plan;
    user.planStartedAt = new Date();
    user.trialEndsAt = null;
    await this.usersRepository.save(user);
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
      isTrialActive: isTrialActive(user),
      trialDaysLeft: trialDaysLeft(user),
      businessLimit: businessLimitFor(user),
      businessesUsed,
    };
  }
}
