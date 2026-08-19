import { Injectable } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';

@Injectable()
export class UploadsService {
  constructor(private readonly provider: CloudinaryProvider) {}
  upload(file: { buffer: Buffer; mimetype: string; originalname: string }) {
    return this.provider.uploadImage(file);
  }
}
