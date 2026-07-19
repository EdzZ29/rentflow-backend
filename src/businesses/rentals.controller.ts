import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ProductsService } from '../products/products.service';
import { BusinessesService } from './businesses.service';

// Public storefront: anyone can browse active rental businesses and products.
@Public()
@Controller('rentals')
export class RentalsController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly productsService: ProductsService,
  ) {}

  // ── Products (declared before :id so "products" isn't parsed as an id) ──
  @Get('products')
  browseProducts(
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.productsService.browse({ category, q });
  }

  @Get('products/:id')
  productDetail(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findPublicOne(id);
  }

  // ── Businesses ────────────────────────────────────────
  @Get()
  browse(@Query('category') category?: string, @Query('q') q?: string) {
    return this.businessesService.browse({ category, q });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.businessesService.findPublicOne(id);
  }
}
