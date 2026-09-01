import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, StoredImage } from './storage-provider';

interface MediaUploadResponse {
  id: string;
  urlPath: string;
  mimeType: string;
}

@Injectable()
export class SelfHostedMediaProvider implements StorageProvider {
  private readonly logger = new Logger(SelfHostedMediaProvider.name);
  private readonly serviceUrl: string;
  private readonly publicUrl: string;
  private readonly projectSlug: string;
  private readonly apiKey?: string;
  private readonly folderPath?: string;

  constructor(config: ConfigService) {
    this.serviceUrl = trimTrailingSlash(
      config.get<string>('media.serviceUrl') ?? 'http://127.0.0.1:3001',
    );
    this.publicUrl = trimTrailingSlash(
      config.get<string>('media.publicUrl') ?? this.serviceUrl,
    );
    this.projectSlug = config.get<string>('media.projectSlug') ?? 'findam';
    this.apiKey = config.get<string>('media.apiKey');
    this.folderPath = config.get<string>('media.folderPath') || undefined;
  }

  async uploadImage(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<StoredImage> {
    if (!this.apiKey) {
      throw new BadRequestException(
        'Self-hosted media storage is not configured',
      );
    }

    const body = new FormData();
    body.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    if (this.folderPath) body.append('folderPath', this.folderPath);

    let response: Response;
    try {
      response = await fetch(
        `${this.serviceUrl}/api/v1/projects/${encodeURIComponent(this.projectSlug)}/assets`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiKey}` },
          body,
          signal: AbortSignal.timeout(20_000),
        },
      );
    } catch (error) {
      this.logger.error(
        `Media service upload failed: ${error instanceof Error ? error.message : 'network error'}`,
      );
      throw new BadGatewayException('Media service is unavailable');
    }

    if (!response.ok) {
      const reason = await response.text().catch(() => 'unknown response');
      this.logger.error(
        `Media service rejected upload (${response.status}): ${reason.slice(0, 300)}`,
      );
      throw new BadGatewayException('Media service rejected the image upload');
    }

    const asset = (await response.json()) as MediaUploadResponse;
    return {
      url: new URL(asset.urlPath, `${this.publicUrl}/`).toString(),
      publicId: asset.id,
      format: file.mimetype.split('/')[1],
    };
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
