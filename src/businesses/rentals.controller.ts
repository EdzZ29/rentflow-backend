import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PackagesService } from '../packages/packages.service';
import { ProductsService } from '../products/products.service';
import { BusinessesService } from './businesses.service';

// Public storefront: anyone can browse active rental businesses and products.
@Public()
@Controller('rentals')
export class RentalsController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly productsService: ProductsService,
    private readonly packagesService: PackagesService,
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

  // Other products from the same business (shown on a product page).
  @Get('products/:id/related')
  relatedProducts(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.relatedByBusiness(id);
  }

  // ── Packages (declared before :id so "packages" isn't parsed as an id) ──
  @Get('packages')
  browsePackages(
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.packagesService.browse({ category, q });
  }

  @Get('packages/:id')
  packageDetail(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findPublicOne(id);
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
