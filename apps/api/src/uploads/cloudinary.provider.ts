import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, StoredImage } from './storage-provider';

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);
  private readonly credentials: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
  };

  constructor(config: ConfigService) {
    this.credentials = {
      cloud_name:
        config.get<string>('cloudinary.cloudName') ??
        process.env.CLOUDINARY_CLOUD_NAME,
      api_key:
        config.get<string>('cloudinary.apiKey') ??
        process.env.CLOUDINARY_API_KEY,
      api_secret:
        config.get<string>('cloudinary.apiSecret') ??
        process.env.CLOUDINARY_API_SECRET,
    };
    cloudinary.config(this.credentials);
  }
  uploadImage(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }) {
    if (
      !this.credentials.cloud_name ||
      !this.credentials.api_key ||
      !this.credentials.api_secret
    )
      throw new BadRequestException('Image storage is not configured');
    return new Promise<StoredImage>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'findam/listings',
          resource_type: 'image',
          ...this.credentials,
        },
        (error, result) => {
          if (error || !result) {
            const reason = error?.message ?? 'Cloudinary returned no result';
            this.logger.error(`Image upload failed: ${reason}`);
            return reject(new BadRequestException('Image upload failed'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        },
      );
      stream.end(file.buffer);
    });
  }
}
