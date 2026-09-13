import "server-only";

export type StorageUploadResult = {
  url: string;
  storage: "local" | "supabase";
  objectPath?: string;
};

export interface StorageProvider {
  upload(
    buffer: Buffer,
    objectPath: string,
    contentType: string,
  ): Promise<StorageUploadResult>;
  delete(urlOrPath: string): Promise<boolean>;
  getPublicUrl(objectPath: string): string;
}
