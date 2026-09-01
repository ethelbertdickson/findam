import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AdminMediaGuard } from "./admin-media.guard";
import { MediaCsrfGuard } from "./media-csrf.guard";
import { MediaController } from "./media.controller";
import { ProjectUploadsController } from "./media.controller";
import { MediaService } from "./media.service";
import { ProjectApiKeyGuard } from "./project-api-key.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [MediaController, ProjectUploadsController],
  providers: [AdminMediaGuard, MediaCsrfGuard, ProjectApiKeyGuard, MediaService],
})
export class MediaModule {}
