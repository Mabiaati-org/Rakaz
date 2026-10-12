import { type INestApplication, ValidationPipe, type ValidationError } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RAKAZ_API_PREFIX, type ApiFieldError } from '@rakaz/contract';
import helmet from 'helmet';

import { ApiError } from './common/api-error.js';
import { AppConfig } from './config/app-config.service.js';

function flattenErrors(errors: ValidationError[], parent = ''): ApiFieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flattenErrors(error.children ?? [], field)];
  });
}

/** Everything `main.ts` and the e2e tests must configure identically. */
export function setupApp(app: INestApplication): void {
  const config = app.get(AppConfig);
  const express = app as NestExpressApplication;

  express.setGlobalPrefix(RAKAZ_API_PREFIX.replace(/^\//, ''));
  express.disable('x-powered-by');
  if (config.trustProxy) express.set('trust proxy', 1);
  express.useBodyParser('json', { limit: '1mb' });

  app.use(helmet());
  app.enableCors({
    // Browsers only: the mobile apps do not send an Origin header and are not subject to CORS.
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors) => ApiError.badRequest('خطأ في البيانات المدخلة', flattenErrors(errors)),
    }),
  );
  app.enableShutdownHooks();
}
