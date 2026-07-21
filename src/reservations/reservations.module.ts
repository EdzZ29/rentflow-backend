import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { Product } from '../products/entities/product.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Product]),
    NotificationsModule,
    RealtimeModule,
    UsersModule,
    ActivityLogModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, PlanActiveGuard],
})
export class ReservationsModule {}
