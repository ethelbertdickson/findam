import { BadRequestException, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'node:fs';
import { diskStorage } from 'multer';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { AdminResourcesService } from './admin-resources.service';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminCsrfGuard } from '../auth/admin-csrf.guard';

@ApiTags('admin resources')
@Controller('admin')
@UseGuards(AdminRoleGuard)
export class AdminResourcesController {
  constructor(private readonly resources: AdminResourcesService) {}

  @Get('users')
  @ApiOperation({ summary: 'List and search users for administration' })
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.resources.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get read-only account and ProjectorPro usage details',
  })
  getUserDetails(@Param('id') id: string) {
    return this.resources.getUserDetails(id);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List and search listings for administration' })
  getListings(@Query() query: AdminListingsQueryDto) {
    return this.resources.getListings(query);
  }

  @Get('downloads/projectorpro')
  getProjectorProDownloads(@Query('limit') limit?: string) {
    return this.resources.getProjectorProDownloads(Math.min(Math.max(Number(limit) || 50, 1), 200));
  }

  @Post('downloads/:app/:platform/upload')
  @UseGuards(AdminCsrfGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 1024 * 1024 * 1024 },
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const directory = '/var/lib/findam/downloads/.tmp';
        mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_request, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
    }),
  }))
  uploadAppRelease(@Param('app') app: string, @Param('platform') platform: string, @UploadedFile() file?: { path: string; originalname: string }) {
    if (!file?.path) throw new BadRequestException('A release file is required.');
    return this.resources.uploadAppRelease(app, platform, file);
  }
}
