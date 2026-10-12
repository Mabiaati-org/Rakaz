import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from './env.js';

/** Typed access to the validated environment. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get env(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }
  get isProduction(): boolean {
    return this.env === 'production';
  }
  get port(): number {
    return this.config.get('PORT', { infer: true });
  }
  get timezone(): string {
    return this.config.get('APP_TIMEZONE', { infer: true });
  }
  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }
  get jwtSecret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }
  get accessTtlSeconds(): number {
    return this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }
  get refreshTtlDays(): number {
    return this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
  }
  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  get trustProxy(): boolean {
    return this.config.get('TRUST_PROXY', { infer: true });
  }
  get swaggerEnabled(): boolean {
    return this.config.get('SWAGGER_ENABLED', { infer: true });
  }
  get expoAccessToken(): string | undefined {
    return this.config.get('EXPO_ACCESS_TOKEN', { infer: true }) || undefined;
  }
}
