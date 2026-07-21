import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateOwnerBookingDto } from './dto/create-owner-booking.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationsService } from './reservations.service';

// Any authenticated user can book. Listing/updating is scoped by role
// inside the service.
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthUser) {
    return this.reservationsService.create(dto, user);
  }

  // Owner/admin manually records a booking for a customer. Blocked when the
  // owner's plan has expired (PlanActiveGuard).
  @Post('owner')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseGuards(PlanActiveGuard)
  createForOwner(
    @Body() dto: CreateOwnerBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservationsService.createForOwner(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.reservationsService.findAll(user);
  }

  @Patch(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservationsService.updateStatus(id, dto.status, user);
  }
}
