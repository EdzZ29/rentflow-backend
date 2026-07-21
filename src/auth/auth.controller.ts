import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ACCESS_COOKIE, accessCookieOptions } from './auth.cookie';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
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

  // Returns the currently authenticated user — lets the web/app restore
  // session state on load (the browser sends the httpOnly cookie automatically).
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
