import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackagesService } from './packages.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @UseGuards(PlanActiveGuard)
  create(@Body() dto: CreatePackageDto, @CurrentUser() user: AuthUser) {
    return this.packagesService.create(dto, user);
  }

  // List packages of a business the caller owns: /packages?businessId=1
  @Get()
  findAll(
    @Query('businessId', ParseIntPipe) businessId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.packagesService.findAllForBusiness(businessId, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.packagesService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(PlanActiveGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.packagesService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(PlanActiveGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.packagesService.remove(id, user);
  }
}
