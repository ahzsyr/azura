import "server-only";

export type StorageBackend = "local" | "supabase" | "s3";

export type StorageUploadResult = {
  /** Denormalized public URL (cache). Canonical identity is backend+bucket+objectKey. */
  url: string;
  storage: StorageBackend;
  bucket: string;
  objectKey: string;
};

export type StorageObjectIdentity = {
  storageBackend: StorageBackend;
  bucket: string;
  objectKey: string;
};

export interface StorageProvider {
  readonly backend: StorageBackend;
  readonly bucket: string;

  upload(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
  ): Promise<StorageUploadResult>;

  /** Delete by canonical identity — never parse url. */
  deleteObject(identity: StorageObjectIdentity): Promise<boolean>;

  getPublicUrl(objectKey: string): string;

  /** Optional signed URL for private remote assets. */
  getSignedUrl?(objectKey: string, ttlSeconds: number): Promise<string>;
}
