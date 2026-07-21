import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { productImageUpload } from './upload.config';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(PlanActiveGuard)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.create(dto, user);
  }

  // List products of a business the caller owns: /products?businessId=1
  @Get()
  findAll(
    @Query('businessId', ParseIntPipe) businessId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.findAllForBusiness(businessId, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.productsService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(PlanActiveGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Post(':id/image')
  @UseGuards(PlanActiveGuard)
  @UseInterceptors(FileInterceptor('image', productImageUpload))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: { filename: string } | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }
    return this.productsService.setImage(
      id,
      `/uploads/products/${file.filename}`,
      user,
    );
  }

  @Delete(':id')
  @UseGuards(PlanActiveGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user);
  }
}
