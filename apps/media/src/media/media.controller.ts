import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminMediaGuard } from "./admin-media.guard";
import { AssetsQueryDto } from "./dto/assets-query.dto";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { CreateProjectDto } from "./dto/create-project.dto";
import { MediaCsrfGuard } from "./media-csrf.guard";
import { MediaService } from "./media.service";
import { ProjectApiKeyGuard } from "./project-api-key.guard";

@Controller("admin")
@UseGuards(AdminMediaGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get("projects")
  listProjects() {
    return this.media.listProjects();
  }

  @Post("projects")
  @UseGuards(MediaCsrfGuard)
  createProject(@Body() dto: CreateProjectDto) {
    return this.media.createProject(dto);
  }

  @Post("projects/:projectId/keys")
  @UseGuards(MediaCsrfGuard)
  createApiKey(@Param("projectId") projectId: string, @Body() dto: CreateApiKeyDto) {
    return this.media.createApiKey(projectId, dto);
  }

  @Post("projects/:projectId/keys/:keyId/revoke")
  @UseGuards(MediaCsrfGuard)
  revokeApiKey(@Param("projectId") projectId: string, @Param("keyId") keyId: string) {
    return this.media.revokeApiKey(projectId, keyId);
  }

  @Get("folders")
  listFolders(@Query("projectSlug") projectSlug: string) {
    return this.media.listFolders(projectSlug);
  }

  @Post("folders")
  @UseGuards(MediaCsrfGuard)
  createFolder(@Body() dto: CreateFolderDto) {
    return this.media.createFolder(dto);
  }

  @Get("assets")
  listAssets(@Query() query: AssetsQueryDto) {
    return this.media.listAssets(query);
  }

  @Post("assets")
  @UseGuards(MediaCsrfGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("projectSlug") projectSlug: string,
    @Body("folderPath") folderPath?: string,
  ) {
    if (!file) throw new BadRequestException("A file is required");
    return this.media.upload(file, projectSlug, folderPath);
  }
}

@Controller("projects")
export class ProjectUploadsController {
  constructor(private readonly media: MediaService) {}

  @Post(":projectSlug/assets")
  @UseGuards(ProjectApiKeyGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @Param("projectSlug") projectSlug: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("folderPath") folderPath?: string,
  ) {
    if (!file) throw new BadRequestException("A file is required");
    return this.media.upload(file, projectSlug, folderPath);
  }
}
