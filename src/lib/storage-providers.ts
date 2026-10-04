import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { resolveUploadObjectDiskPath, deleteLocalUploadFile } from "@/lib/local-media-files";
import { createClient } from "@supabase/supabase-js";
import type {
  StorageBackend,
  StorageObjectIdentity,
  StorageProvider,
  StorageUploadResult,
} from "@/lib/storage-provider";

function getSupabaseProjectUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
}

function getSupabaseMediaBucket(): string {
  return process.env.SUPABASE_MEDIA_BUCKET?.trim() || "media";
}

function getSupabaseAdmin() {
  const url = getSupabaseProjectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Supabase storage.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly backend = "supabase" as const;
  get bucket(): string {
    return getSupabaseMediaBucket();
  }

  async upload(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const supabase = getSupabaseAdmin();
    const bucket = this.bucket;
    let { error } = await supabase.storage.from(bucket).upload(objectKey, buffer, {
      contentType,
      upsert: false,
    });

    if (error?.message.toLowerCase().includes("bucket")) {
      await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: 64 * 1024 * 1024 });
      ({ error } = await supabase.storage.from(bucket).upload(objectKey, buffer, {
        contentType,
        upsert: false,
      }));
    }

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return {
      url: this.getPublicUrl(objectKey),
      storage: "supabase",
      bucket,
      objectKey,
    };
  }

  async deleteObject(identity: StorageObjectIdentity): Promise<boolean> {
    if (identity.storageBackend !== "supabase") return false;
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage
        .from(identity.bucket || this.bucket)
        .remove([identity.objectKey]);
      return !error;
    } catch {
      return false;
    }
  }

  getPublicUrl(objectKey: string): string {
    const supabase = getSupabaseAdmin();
    return supabase.storage.from(this.bucket).getPublicUrl(objectKey).data.publicUrl;
  }

  async getSignedUrl(objectKey: string, ttlSeconds: number): Promise<string> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(objectKey, ttlSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Failed to create Supabase signed URL");
    }
    return data.signedUrl;
  }
}

export class LocalStorageProvider implements StorageProvider {
  readonly backend = "local" as const;
  readonly bucket = "local";

  async upload(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    void contentType;
    const absPath = resolveUploadObjectDiskPath(objectKey);
    await mkdir(resolve(absPath, ".."), { recursive: true });
    await writeFile(absPath, buffer);
    console.log(`[media-storage] wrote local upload: ${absPath}`);
    return {
      url: this.getPublicUrl(objectKey),
      storage: "local",
      bucket: this.bucket,
      objectKey,
    };
  }

  async deleteObject(identity: StorageObjectIdentity): Promise<boolean> {
    if (identity.storageBackend !== "local") return false;
    const publicUrl = this.getPublicUrl(identity.objectKey);
    return deleteLocalUploadFile(publicUrl);
  }

  getPublicUrl(objectKey: string): string {
    const [subDir, ...rest] = objectKey.split("/");
    const filename = rest.join("/") || objectKey;
    return `/uploads/${subDir}/${filename}`;
  }
}

/** Resolve MEDIA_STORAGE explicitly (no Vercel heuristic). */
export function resolveMediaStorageBackend(): StorageBackend {
  const raw = (process.env.MEDIA_STORAGE ?? "local").trim().toLowerCase();
  if (raw === "supabase" || raw === "s3" || raw === "local") return raw;
  return "local";
}

function createS3StorageProvider(): StorageProvider {
  // Lazy require so local/supabase paths do not pull AWS into the default module graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { S3StorageProvider } = require("@/lib/storage-providers-s3") as typeof import("@/lib/storage-providers-s3");
  return new S3StorageProvider();
}

/**
 * Single factory for all media byte mutations.
 * Routes/actions must not call fs / Supabase / S3 SDKs directly.
 */
export function createStorageProvider(backend?: StorageBackend): StorageProvider {
  const selected = backend ?? resolveMediaStorageBackend();
  switch (selected) {
    case "supabase":
      return new SupabaseStorageProvider();
    case "s3":
      return createS3StorageProvider();
    case "local":
    default:
      return new LocalStorageProvider();
  }
}

export function providerForBackend(backend: string): StorageProvider {
  if (backend === "supabase" || backend === "s3" || backend === "local") {
    return createStorageProvider(backend);
  }
  return createStorageProvider("local");
}
