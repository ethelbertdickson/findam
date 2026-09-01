import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SelfHostedMediaProvider } from './self-hosted-media.provider';

describe('SelfHostedMediaProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uploads to the scoped project and returns a public delivery URL', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'asset-id',
          urlPath: '/media/asset-id.jpg',
          mimeType: 'image/jpeg',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const provider = new SelfHostedMediaProvider(
      new ConfigService({
        media: {
          serviceUrl: 'http://127.0.0.1:3001',
          publicUrl: 'https://media.findam.test',
          projectSlug: 'findam',
          apiKey: 'server-only-test-key',
          folderPath: '',
        },
      }),
    );

    await expect(
      provider.uploadImage({
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/jpeg',
        originalname: 'listing.jpg',
      }),
    ).resolves.toEqual({
      url: 'https://media.findam.test/media/asset-id.jpg',
      publicId: 'asset-id',
      format: 'jpeg',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/v1/projects/findam/assets',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer server-only-test-key' },
        body: expect.any(FormData),
      }),
    );
  });

  it('does not expose a media-service error to the client', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'sensitive upstream detail' }), {
        status: 401,
      }),
    );
    const provider = new SelfHostedMediaProvider(
      new ConfigService({
        media: {
          serviceUrl: 'http://127.0.0.1:3001',
          projectSlug: 'findam',
          apiKey: 'invalid-test-key',
        },
      }),
    );

    await expect(
      provider.uploadImage({
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/png',
        originalname: 'listing.png',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
