import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { Business } from '../businesses/entities/business.entity';
import { PaypalModule } from '../paypal/paypal.module';
import { User } from '../users/entities/user.entity';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Business]),
    ActivityLogModule,
    PaypalModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
