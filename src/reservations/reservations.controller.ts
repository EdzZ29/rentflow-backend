import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanActiveGuard } from '../auth/guards/plan-active.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateOwnerBookingDto } from './dto/create-owner-booking.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationsService } from './reservations.service';
import { reservationDocUpload } from './upload.config';

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

  // Upload a requirement document (valid ID / driver's licence) for a booking.
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('image', reservationDocUpload))
  uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query('kind') kind: string,
    @UploadedFile() file: { filename: string } | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }
    if (kind !== 'validId' && kind !== 'licenseId') {
      throw new BadRequestException('kind must be validId or licenseId');
    }
    return this.reservationsService.attachDocument(
      id,
      kind,
      `/uploads/reservations/${file.filename}`,
      user,
    );
  }

  // Scanned from a booking QR — anyone holding the code can read the summary.
  // The response says which kind of code it is (release or return).
  @Public()
  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.reservationsService.findByToken(token);
  }

  // Owner scans a code: releases the unit, or closes out its return. Which one
  // happens is determined by the code itself, never by the caller.
  @Post('verify/:token/scan')
  scan(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.reservationsService.scanToken(token, user);
  }

  // Manual equivalents, for when the renter can't show a code.
  @Post(':id/release')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  release(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservationsService.releaseManually(id, user);
  }

  @Post(':id/return')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  returnUnit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservationsService.returnManually(id, user);
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
