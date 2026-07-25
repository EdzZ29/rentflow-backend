import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

// Reviews live under a product: /rentals/products/:productId/reviews
@Controller('rentals/products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Anyone can read the reviews for a product.
  @Public()
  @Get()
  list(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.listForProduct(productId);
  }

  // Signed-in customers can post (or update) their review.
  @Post()
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviewsService.createOrUpdate(productId, dto, user);
  }
}

// The signed-in customer's own reviews (for their dashboard).
@Controller('reviews')
export class MyReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.reviewsService.listMine(user.id);
  }
}
