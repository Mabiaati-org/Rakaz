import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

const toBool = ({ value }: { value: unknown }): boolean => value === true || value === 'true' || value === '1';
const toInt = ({ value }: { value: unknown }): number => Number(value);

export class Env {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 8787;

  @IsString()
  APP_TIMEZONE: string = 'Asia/Baghdad';

  @IsString()
  @MinLength(1)
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET: string;

  @Transform(toInt)
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 30;

  @IsString()
  CORS_ORIGINS: string = '';

  @Transform(toBool)
  @IsBoolean()
  TRUST_PROXY: boolean = false;

  @Transform(toBool)
  @IsBoolean()
  SWAGGER_ENABLED: boolean = false;

  @IsOptional()
  @IsString()
  EXPO_ACCESS_TOKEN?: string;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: true });
  if (errors.length > 0) {
    const details = errors.flatMap((e) => Object.values(e.constraints ?? {})).join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }
  if (env.NODE_ENV === 'production' && /CHANGE_ME|dev-only/i.test(env.JWT_ACCESS_SECRET)) {
    throw new Error('JWT_ACCESS_SECRET still has its placeholder value; set a real secret before running in production.');
  }
  return env;
}
