import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { Business } from './entities/business.entity';
import { RentalsController } from './rentals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business]),
    UsersModule,
    ProductsModule,
    ActivityLogModule,
  ],
  controllers: [BusinessesController, RentalsController],
  providers: [BusinessesService, PlanActiveGuard],
  exports: [BusinessesService],
})
export class BusinessesModule {}
