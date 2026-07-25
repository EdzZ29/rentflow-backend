import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { User } from '../users/entities/user.entity';
import { avatarImageUpload } from '../users/avatar-upload.config';
import { UsersService } from '../users/users.service';
import { ACCESS_COOKIE, accessCookieOptions } from './auth.cookie';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly usersService: UsersService,
  ) {}

  // Max 10 registrations per minute per IP.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    res.cookie(ACCESS_COOKIE, result.accessToken, accessCookieOptions());
    return result;
  }

  // Max 5 login attempts per minute per IP (brute-force protection).
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie(ACCESS_COOKIE, result.accessToken, accessCookieOptions());
    return result;
  }

  // Clears the auth cookie. Public so it works even with an expired session.
  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _maxAge, ...clearOptions } = accessCookieOptions();
    res.clearCookie(ACCESS_COOKIE, clearOptions);
    return { success: true };
  }

  // Start a password reset. Always returns success (even for unknown emails) so
  // attackers can't use it to discover which addresses have accounts.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.passwordReset.requestReset(dto.email);
    return {
      success: true,
      message: 'If that email is registered, a reset link is on its way.',
    };
  }

  // Complete a password reset using the token from the emailed link.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordReset.resetPassword(dto.token, dto.password);
    return { success: true, message: 'Your password has been updated.' };
  }

  // Returns the currently authenticated user's full profile — lets the web/app
  // restore session state on load (the browser sends the cookie automatically).
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.toProfile(await this.usersService.findOne(user.id));
  }

  // Update the signed-in user's own profile (name / email / password).
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.toProfile(await this.usersService.updateProfile(user.id, dto));
  }

  // Upload/replace the signed-in user's profile picture.
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('image', avatarImageUpload))
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { filename: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }
    const updated = await this.usersService.setAvatar(
      user.id,
      `/uploads/avatars/${file.filename}`,
    );
    return this.toProfile(updated);
  }

  // The public profile shape shared by /me, PATCH /me and avatar upload — never
  // leaks the password hash or other internal columns.
  private toProfile(u: User) {
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      plan: u.plan,
      avatarUrl: u.avatarUrl,
    };
  }
}
