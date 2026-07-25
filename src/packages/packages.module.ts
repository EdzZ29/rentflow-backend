import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { Business } from '../businesses/entities/business.entity';
import { ReviewsModule } from '../reviews/reviews.module';
import { UsersModule } from '../users/users.module';
import { RentalPackage } from './entities/package.entity';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RentalPackage, Business]),
    ReviewsModule,
    UsersModule,
    ActivityLogModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService, PlanActiveGuard],
  exports: [PackagesService],
})
export class PackagesModule {}
