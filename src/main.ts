import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { BUSINESS_UPLOAD_DIR } from './businesses/upload.config';
import { PRODUCT_UPLOAD_DIR } from './products/upload.config';
import { AVATAR_UPLOAD_DIR } from './users/avatar-upload.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Security HTTP headers. Allow images to be loaded cross-origin (the web app
  // runs on a different origin than the API in dev).
  app.use(
    helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  );

  // Parse cookies so the JWT strategy can read the httpOnly auth cookie.
  app.use(cookieParser());

  // Serve uploaded images from /uploads/*.
  for (const dir of [PRODUCT_UPLOAD_DIR, BUSINESS_UPLOAD_DIR, AVATAR_UPLOAD_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // All routes are served under /api (e.g. /api/vehicles, /api/auth/login).
  app.setGlobalPrefix('api');

  // Validate + strip unknown properties on every incoming DTO.
  // forbidNonWhitelisted blocks mass-assignment of unexpected fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Allow the web (Vite) and mobile (Expo) clients to call the API with
  // credentials (cookies). Origins are an explicit allow-list, never "*".
  const origins = config.get<string>('CORS_ORIGINS', '');
  app.enableCors({
    origin:
      origins.trim() === '' || origins.trim() === '*'
        ? true
        : origins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Refuse to run production with a weak/default JWT secret.
  const secret = config.get<string>('JWT_SECRET', '');
  const isProd = process.env.NODE_ENV === 'production';
  if (!secret || secret.length < 24 || secret.includes('change-me')) {
    const msg = 'JWT_SECRET is missing or weak — set a long random value.';
    if (isProd) throw new Error(msg);
    new Logger('Bootstrap').warn(`${msg} (allowed in development only)`);
  }

  const port = config.get<number>('PORT', 5000);
  await app.listen(port);
  console.log(`RentFlow API running on http://localhost:${port}/api`);
}
bootstrap();
