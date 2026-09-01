import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider';
import { SelfHostedMediaProvider } from './self-hosted-media.provider';
import type { StorageProvider } from './storage-provider';

@Injectable()
export class UploadsService {
  private readonly provider: StorageProvider;

  constructor(
    cloudinary: CloudinaryProvider,
    selfHostedMedia: SelfHostedMediaProvider,
    config: ConfigService,
  ) {
    const selected = config.get<string>('storage.provider') ?? 'cloudinary';
    if (selected === 'self-hosted') this.provider = selfHostedMedia;
    else if (selected === 'cloudinary') this.provider = cloudinary;
    else throw new BadRequestException(`Unknown storage provider: ${selected}`);
  }

  upload(file: { buffer: Buffer; mimetype: string; originalname: string }) {
    return this.provider.uploadImage(file);
  }
}
