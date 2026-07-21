import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { BusinessesModule } from './businesses/businesses.module';
import { DatabaseModule } from './database/database.module';
import { DriversModule } from './drivers/drivers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProductsModule } from './products/products.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global rate limit: 100 requests / minute / IP (auth routes are stricter).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    TripsModule,
    BusinessesModule,
    ProductsModule,
    ReservationsModule,
    SubscriptionModule,
    AdminModule,
    RealtimeModule,
    NotificationsModule,
    ActivityLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate limiting runs first, before authentication.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Every route requires a valid JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Enforces @Roles() metadata after authentication.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
