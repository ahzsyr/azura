import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { UPLOAD_ROOT } from "@/lib/local-media-storage";
import { deleteLocalUploadFile } from "@/lib/local-media-files";
import type { StorageProvider, StorageUploadResult } from "@/lib/storage-provider";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";

function getSupabaseProjectUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
}

function getMediaBucket(): string {
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
  async upload(
    buffer: Buffer,
    objectPath: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const supabase = getSupabaseAdmin();
    const bucket = getMediaBucket();
    let { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });

    if (error?.message.toLowerCase().includes("bucket")) {
      await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: 64 * 1024 * 1024 });
      ({ error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
        contentType,
        upsert: false,
      }));
    }

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return {
      url: this.getPublicUrl(objectPath),
      storage: "supabase",
      objectPath,
    };
  }

  async delete(urlOrPath: string): Promise<boolean> {
    const projectUrl = getSupabaseProjectUrl();
    const bucket = getMediaBucket();
    const prefix = `${projectUrl}/storage/v1/object/public/${bucket}/`;
    const objectPath = urlOrPath.startsWith(prefix)
      ? urlOrPath.slice(prefix.length)
      : urlOrPath.startsWith("/uploads/")
        ? null
        : urlOrPath;

    if (!objectPath) return false;

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(bucket).remove([objectPath]);
      return !error;
    } catch {
      return false;
    }
  }

  getPublicUrl(objectPath: string): string {
    const supabase = getSupabaseAdmin();
    const bucket = getMediaBucket();
    return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  }
}

export class LocalStorageProvider implements StorageProvider {
  async upload(
    buffer: Buffer,
    objectPath: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    if (isCloudNativeProduction()) {
      throw new Error("Local storage is disabled in cloud-native mode.");
    }
    void contentType;
    const absPath = resolve(process.cwd(), UPLOAD_ROOT, objectPath);
    await mkdir(resolve(absPath, ".."), { recursive: true });
    await writeFile(absPath, buffer);
    const [subDir, ...rest] = objectPath.split("/");
    const filename = rest.join("/") || objectPath;
    return {
      url: `/uploads/${subDir}/${filename}`,
      storage: "local",
      objectPath,
    };
  }

  async delete(urlOrPath: string): Promise<boolean> {
    if (urlOrPath.startsWith("/uploads/")) {
      return deleteLocalUploadFile(urlOrPath);
    }
    return false;
  }

  getPublicUrl(objectPath: string): string {
    const [subDir, ...rest] = objectPath.split("/");
    const filename = rest.join("/") || objectPath;
    return `/uploads/${subDir}/${filename}`;
  }
}

export function createStorageProvider(remote: boolean): StorageProvider {
  if (remote || isCloudNativeProduction()) {
    return new SupabaseStorageProvider();
  }
  return new LocalStorageProvider();
}
