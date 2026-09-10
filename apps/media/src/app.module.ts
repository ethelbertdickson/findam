import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "node:path";
import * as dotenv from "dotenv";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";
import { validateMediaEnv } from "./config/env.validation";

// Load the app-local environment before ConfigModule validates it. This keeps
// root-level monorepo scripts and systemd launches consistent.
dotenv.config({ path: join(__dirname, "../.env.production") });
dotenv.config({ path: join(__dirname, "../.env") });

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [
      join(__dirname, "../.env.production"),
      join(__dirname, "../.env"),
      ".env.production",
      ".env",
    ],
    validate: validateMediaEnv,
  }), PrismaModule, MediaModule],
  controllers: [HealthController],
})
export class AppModule {}
