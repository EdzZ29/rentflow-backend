import { PlanType, User } from '../users/entities/user.entity';

type PlanInfo = Pick<User, 'plan' | 'trialEndsAt' | 'planEndsAt'>;

// How many businesses each plan allows.
export const PLAN_BUSINESS_LIMIT: Record<PlanType, number> = {
  [PlanType.NONE]: 0,
  [PlanType.TRIAL]: 1,
  [PlanType.MONTHLY]: 5,
  [PlanType.YEARLY]: 1000,
};

// How long a paid plan lasts, in days, from the moment it is chosen.
export const PLAN_DURATION_DAYS: Partial<Record<PlanType, number>> = {
  [PlanType.MONTHLY]: 30,
  [PlanType.YEARLY]: 365,
};

export function isTrialActive(user: PlanInfo): boolean {
  return (
    user.plan === PlanType.TRIAL &&
    !!user.trialEndsAt &&
    new Date(user.trialEndsAt).getTime() > Date.now()
  );
}

// A paid plan is active while it has no end date (legacy/never-expiring) or its
// end date is still in the future.
export function isPaidActive(user: PlanInfo): boolean {
  if (user.plan !== PlanType.MONTHLY && user.plan !== PlanType.YEARLY) {
    return false;
  }
  return !user.planEndsAt || new Date(user.planEndsAt).getTime() > Date.now();
}

export function trialDaysLeft(user: PlanInfo): number {
  if (!isTrialActive(user) || !user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Days left on a paid plan (0 if none / expired / never-expiring).
export function planDaysLeft(user: PlanInfo): number {
  if (!isPaidActive(user) || !user.planEndsAt) return 0;
  const ms = new Date(user.planEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * The plan the owner effectively has right now. A trial that has run out, or a
 * paid plan past its end date, behaves like NONE until the owner subscribes.
 */
export function effectivePlan(user: PlanInfo): PlanType {
  if (user.plan === PlanType.TRIAL && !isTrialActive(user)) {
    return PlanType.NONE;
  }
  if (
    (user.plan === PlanType.MONTHLY || user.plan === PlanType.YEARLY) &&
    !isPaidActive(user)
  ) {
    return PlanType.NONE;
  }
  return user.plan;
}

// True while the owner can use paid features; false once the plan has lapsed.
export function isPlanActive(user: PlanInfo): boolean {
  return effectivePlan(user) !== PlanType.NONE;
}

export function businessLimitFor(user: PlanInfo): number {
  return PLAN_BUSINESS_LIMIT[effectivePlan(user)];
}
