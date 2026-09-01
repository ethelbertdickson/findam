export default () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'cloudinary',
  },
  media: {
    serviceUrl: process.env.MEDIA_SERVICE_URL ?? 'http://127.0.0.1:3001',
    publicUrl: process.env.MEDIA_PUBLIC_URL ?? process.env.MEDIA_SERVICE_URL,
    projectSlug: process.env.MEDIA_PROJECT_SLUG ?? 'findam',
    apiKey: process.env.MEDIA_API_KEY,
    folderPath: process.env.MEDIA_FOLDER_PATH,
  },
  google: {
    clientIds: (process.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((clientId) => clientId.trim())
      .filter(Boolean),
  },
  geoapify: {
    apiKey: process.env.GEOAPIFY_API_KEY,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
