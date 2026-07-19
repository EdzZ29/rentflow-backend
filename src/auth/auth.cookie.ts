import type { CookieOptions } from 'express';

export const ACCESS_COOKIE = 'access_token';

// httpOnly  → not readable by JavaScript (defends against XSS token theft)
// secure    → only sent over HTTPS in production
// sameSite  → not sent on cross-site requests (defends against CSRF)
export function accessCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
