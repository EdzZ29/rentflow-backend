import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Product } from '../products/entities/product.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Review } from './entities/review.entity';
import { OwnerReviewsController } from './owner-reviews.controller';
import { MyReviewsController, ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Product, Reservation]),
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [ReviewsController, MyReviewsController, OwnerReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
