import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { resolve } from "node:path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const prefix = process.env.API_PREFIX ?? "api/v1";
  app.setGlobalPrefix(prefix);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(resolve(process.env.MEDIA_STORAGE_PATH ?? "./storage"), {
    prefix: "/media",
  });
  await app.listen(process.env.MEDIA_PORT ?? 3001);
}

bootstrap().catch((error: unknown) => {
  console.error("Findam media service failed to start", error);
  process.exitCode = 1;
});
