import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  // Lazily build the SMTP transport. If SMTP isn't configured (e.g. local dev),
  // we fall back to logging the email so flows stay testable without Gmail creds.
  private getTransport(): Transporter | null {
    if (this.initialized) return this.transporter;
    this.initialized = true;

    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — emails will be logged, not sent.',
      );
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '465')),
      secure: this.config.get<string>('SMTP_SECURE', 'true') === 'true',
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendPasswordReset(to: string, link: string): Promise<void> {
    const from = this.config.get<string>(
      'MAIL_FROM',
      'Rentivo <no-reply@rentivo.local>',
    );
    const subject = 'Reset your Rentivo password';
    const text = `We received a request to reset your Rentivo password.\n\nReset it here (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can safely ignore this email.`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p style="color:#475569">We received a request to reset your Rentivo password. This link is valid for 1 hour.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#0d9488;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">Reset password</a>
        </p>
        <p style="color:#94a3b8;font-size:13px">If the button doesn't work, paste this link into your browser:<br>${link}</p>
        <p style="color:#94a3b8;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>`;

    const transport = this.getTransport();
    if (!transport) {
      this.logger.log(`[DEV] Password reset link for ${to}: ${link}`);
      return;
    }
    await transport.sendMail({ from, to, subject, text, html });
  }
}
