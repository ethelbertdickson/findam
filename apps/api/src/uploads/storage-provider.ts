export interface StoredImage {
  url: string;
  thumbnailUrl?: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface StorageProvider {
  uploadMedia(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }, uploader?: MediaUploader): Promise<StoredImage>;
  uploadImage?(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<StoredImage>;
  deleteMedia?(publicId: string): Promise<void>;
}

export interface MediaUploader {
  id?: string;
  role?: string;
  email?: string;
}
