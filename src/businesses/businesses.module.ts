import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { Business } from './entities/business.entity';
import { RentalsController } from './rentals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Business]), UsersModule, ProductsModule],
  controllers: [BusinessesController, RentalsController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
