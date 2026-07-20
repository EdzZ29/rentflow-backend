import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { CURRENCY_CODES } from '../currency';
import { ProductAvailability } from '../entities/product.entity';

export class CreateProductDto {
  @IsInt()
  businessId: number;

  @IsString()
  @Length(1, 140)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currency?: string;

  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
