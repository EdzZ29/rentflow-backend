import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const RESET_TTL_MINUTES = 60;

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokens: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  // Send a reset link. Always resolves the same way (even for unknown emails) so
  // we don't reveal which addresses have accounts.
  async requestReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    // Invalidate any earlier outstanding tokens for this user.
    await this.tokens.update({ userId: user.id, used: false }, { used: true });

    const raw = randomBytes(32).toString('hex');
    await this.tokens.save(
      this.tokens.create({
        userId: user.id,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
        used: false,
      }),
    );

    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const link = `${frontend}/reset-password?token=${raw}`;
    await this.mail.sendPasswordReset(user.email, link);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.tokens.findOne({
      where: { tokenHash: this.hash(rawToken), used: false },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }

    await this.usersService.update(record.userId, { password: newPassword });

    // Burn this token and any siblings so the link can't be reused.
    await this.tokens.update({ userId: record.userId, used: false }, { used: true });
  }
}
