import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { CURRENCY_CODES } from '../../products/currency';
import {
  PackageAvailability,
  PackagePriceUnit,
} from '../entities/package.entity';

// One inclusion with its standalone price (for the itemised-value display).
export class ItemValueDto {
  @IsString()
  @Length(1, 120)
  label: string;

  @IsNumber()
  @Min(0)
  value: number;
}

// A named option tier (Option A / Option B).
export class PackageOptionDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  inclusions?: string[];
}

// One rung of a discount ladder — a price plus the client's exchange for it.
export class PriceTierDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @Length(1, 300)
  condition: string;
}

export class CreatePackageDto {
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
  price: number;

  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currency?: string;

  @IsOptional()
  @IsEnum(PackagePriceUnit)
  priceUnit?: PackagePriceUnit;

  // Free-form inclusion lines the owner types in manually.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  items?: string[];

  // Itemised standalone values (drives the "you save" bundle display).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ItemValueDto)
  itemValues?: ItemValueDto[];

  // Named option tiers (Option A / Option B …).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PackageOptionDto)
  options?: PackageOptionDto[];

  // Discount ladder — each rung is a price with a required exchange.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  tiers?: PriceTierDto[];

  @IsOptional()
  @IsEnum(PackageAvailability)
  availability?: PackageAvailability;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
