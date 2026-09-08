import { IsEnum } from 'class-validator';
import { PlanType } from '../entities/user.entity';

// Admin-only plan override. Kept separate from UpdateUserDto so an ordinary
// profile edit can never change billing state by accident.
export class SetPlanDto {
  @IsEnum(PlanType, {
    message: 'Plan must be none, trial, monthly or yearly.',
  })
  plan: PlanType;
}
