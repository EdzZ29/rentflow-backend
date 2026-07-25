import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePackageDto } from './create-package.dto';

// businessId can't be changed after creation.
export class UpdatePackageDto extends PartialType(
  OmitType(CreatePackageDto, ['businessId'] as const),
) {}
