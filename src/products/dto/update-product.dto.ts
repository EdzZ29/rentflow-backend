import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// businessId can't be changed after creation.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['businessId'] as const),
) {}
