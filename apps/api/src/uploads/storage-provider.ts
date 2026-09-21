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
  }): Promise<StoredImage>;
  uploadImage?(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<StoredImage>;
  deleteMedia?(publicId: string): Promise<void>;
}
