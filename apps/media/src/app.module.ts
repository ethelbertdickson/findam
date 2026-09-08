import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";
import { validateMediaEnv } from "./config/env.validation";

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [".env.production", ".env"],
    validate: validateMediaEnv,
  }), PrismaModule, MediaModule],
  controllers: [HealthController],
})
export class AppModule {}
