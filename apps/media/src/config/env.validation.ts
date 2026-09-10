import { plainToInstance, Type } from "class-transformer";
import { IsEnum, IsInt, IsString, Max, Min, validateSync } from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

class MediaEnvironment {
  @IsEnum(Environment) NODE_ENV: Environment = Environment.Development;
  @Type(() => Number) @IsInt() @Min(0) @Max(65535) MEDIA_PORT = 3001;
  @IsString() API_PREFIX = "api/v1";
  @IsString() CORS_ORIGIN = "http://localhost:5173";
  @IsString() MEDIA_DATABASE_URL!: string;
  @IsString() MEDIA_STORAGE_PATH = "./storage";
  @IsString() JWT_ACCESS_SECRET!: string;
}

export function validateMediaEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(MediaEnvironment, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(`Media environment validation failed: ${errors.toString()}`);
  }
  return validated;
}
