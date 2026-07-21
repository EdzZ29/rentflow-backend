import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { Business } from '../businesses/entities/business.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { UsersModule } from '../users/users.module';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Business, Reservation]),
    UsersModule,
    ActivityLogModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, PlanActiveGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
