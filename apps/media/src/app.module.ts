import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MediaModule],
  controllers: [HealthController],
})
export class AppModule {}
