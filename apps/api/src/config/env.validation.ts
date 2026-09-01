import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  API_PREFIX: string = 'api/v1';

  @IsString()
  CORS_ORIGIN: string = '*';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  @IsOptional()
  @IsString()
  STORAGE_PROVIDER?: string;

  @IsOptional()
  @IsString()
  MEDIA_SERVICE_URL?: string;

  @IsOptional()
  @IsString()
  MEDIA_PUBLIC_URL?: string;

  @IsOptional()
  @IsString()
  MEDIA_PROJECT_SLUG?: string;

  @IsOptional()
  @IsString()
  MEDIA_API_KEY?: string;

  @IsOptional()
  @IsString()
  MEDIA_FOLDER_PATH?: string;

  @IsOptional()
  @IsString()
  GEOAPIFY_API_KEY?: string;

  @IsInt()
  THROTTLE_TTL: number = 60;

  @IsInt()
  THROTTLE_LIMIT: number = 100;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}
