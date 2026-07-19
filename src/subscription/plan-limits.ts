import { PlanType, User } from '../users/entities/user.entity';

type PlanInfo = Pick<User, 'plan' | 'trialEndsAt'>;

// How many businesses each plan allows.
export const PLAN_BUSINESS_LIMIT: Record<PlanType, number> = {
  [PlanType.NONE]: 0,
  [PlanType.TRIAL]: 1,
  [PlanType.MONTHLY]: 5,
  [PlanType.YEARLY]: 1000,
};

export function isTrialActive(user: PlanInfo): boolean {
  return (
    user.plan === PlanType.TRIAL &&
    !!user.trialEndsAt &&
    new Date(user.trialEndsAt).getTime() > Date.now()
  );
}

export function trialDaysLeft(user: PlanInfo): number {
  if (!isTrialActive(user) || !user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** A trial that has run out behaves like NONE until the owner subscribes. */
export function effectivePlan(user: PlanInfo): PlanType {
  if (user.plan === PlanType.TRIAL && !isTrialActive(user)) {
    return PlanType.NONE;
  }
  return user.plan;
}

export function businessLimitFor(user: PlanInfo): number {
  return PLAN_BUSINESS_LIMIT[effectivePlan(user)];
}
