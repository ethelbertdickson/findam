import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { CloudinaryProvider } from './cloudinary.provider';
import { UploadsService } from './uploads.service';
import { SelfHostedMediaProvider } from './self-hosted-media.provider';

@Module({
  controllers: [UploadsController],
  providers: [CloudinaryProvider, SelfHostedMediaProvider, UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
