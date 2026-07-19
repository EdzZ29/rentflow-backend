import { IsIn } from 'class-validator';
import { PlanType } from '../../users/entities/user.entity';

export class ChoosePlanDto {
  @IsIn([PlanType.MONTHLY, PlanType.YEARLY])
  plan: PlanType.MONTHLY | PlanType.YEARLY;
}
