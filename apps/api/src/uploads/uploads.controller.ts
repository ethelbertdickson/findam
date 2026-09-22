import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 80 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(null, file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')),
    }),
  )
  upload(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    },
    @CurrentUser() currentUser: JwtAccessPayload,
  ) {
    if (!file) throw new BadRequestException('An image or video file is required');
    return this.uploads.upload(file, { id: currentUser.sub, email: currentUser.email, role: currentUser.role });
  }
}
