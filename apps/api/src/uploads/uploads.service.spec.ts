import { ConfigService } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider';
import { SelfHostedMediaProvider } from './self-hosted-media.provider';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  const file = {
    buffer: Buffer.from('image'),
    mimetype: 'image/jpeg',
    originalname: 'listing.jpg',
  };

  it('uses self-hosted media when selected', async () => {
    const cloudinary = { uploadImage: jest.fn() };
    const selfHosted = {
      uploadImage: jest.fn().mockResolvedValue({ url: 'https://media/image' }),
    };
    const service = new UploadsService(
      cloudinary as unknown as CloudinaryProvider,
      selfHosted as unknown as SelfHostedMediaProvider,
      new ConfigService({ storage: { provider: 'self-hosted' } }),
    );

    await expect(service.upload(file)).resolves.toEqual({
      url: 'https://media/image',
    });
    expect(selfHosted.uploadImage).toHaveBeenCalledWith(file);
    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
  });

  it('keeps Cloudinary available as the default fallback', async () => {
    const cloudinary = {
      uploadImage: jest
        .fn()
        .mockResolvedValue({ url: 'https://cloudinary/image' }),
    };
    const selfHosted = { uploadImage: jest.fn() };
    const service = new UploadsService(
      cloudinary as unknown as CloudinaryProvider,
      selfHosted as unknown as SelfHostedMediaProvider,
      new ConfigService({}),
    );

    await expect(service.upload(file)).resolves.toEqual({
      url: 'https://cloudinary/image',
    });
    expect(cloudinary.uploadImage).toHaveBeenCalledWith(file);
    expect(selfHosted.uploadImage).not.toHaveBeenCalled();
  });
});
