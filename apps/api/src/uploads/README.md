# uploads (Phase 4)

Image upload abstraction. `CloudinaryProvider` and `SelfHostedMediaProvider`
implement the same `StorageProvider` interface, so mobile and listing code do
not know which backend stores the image. Set `STORAGE_PROVIDER=self-hosted`
only after adding the Findam project's server key to `MEDIA_API_KEY`.
