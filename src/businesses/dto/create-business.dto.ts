import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { BusinessPlan, BusinessStatus } from '../entities/business.entity';

export class CreateBusinessDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(1, 80)
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  location?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  phone?: string;

  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @IsOptional()
  @IsEnum(BusinessPlan)
  subscriptionType?: BusinessPlan;
}
