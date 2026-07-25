import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ReviewsService } from './reviews.service';

// Owner dashboard: read every review across their products and reply to them.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('owner/reviews')
export class OwnerReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.reviewsService.listForOwner(user.id);
  }

  @Post(':id/reply')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviewsService.reply(id, dto.reply, user);
  }

  @Delete(':id/reply')
  @HttpCode(HttpStatus.OK)
  deleteReply(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviewsService.deleteReply(id, user);
  }
}
