import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import type { MediaType } from "@prisma/client";
import { SUBDIR, UPLOAD_ROOT, safeFilename } from "@/lib/local-media-storage";
import { deleteLocalUploadFile } from "@/lib/local-media-files";

export type StoredUpload = {
  url: string;
  storage: "local" | "supabase";
  objectPath?: string;
};

function usesSupabaseDatabase(): boolean {
  const url = (process.env.DATABASE_URL ?? "").toLowerCase();
  return url.includes("supabase.com");
}

function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

import type { MediaStorageStatus } from "@/features/media/media-storage-status";

export type { MediaStorageStatus } from "@/features/media/media-storage-status";

export const MEDIA_STORAGE_SETUP_STEPS =
  "Supabase Dashboard → Project Settings → API → copy the service_role secret (not anon). " +
  "Add SUPABASE_SERVICE_ROLE_KEY to Hostinger/Vercel env, set MEDIA_STORAGE=supabase, run database/postgres/03-storage-media.sql once, then redeploy.";

/** Whether CMS uploads use Supabase Storage (requires SUPABASE_SERVICE_ROLE_KEY). */
export function useRemoteMediaStorage(): boolean {
  if (process.env.MEDIA_STORAGE === "local") return false;
  if (hasServiceRoleKey()) return true;
  if (process.env.MEDIA_STORAGE === "supabase") return true;
  if (process.env.VERCEL) return true;
  return false;
}

export function getMediaStorageStatus(): MediaStorageStatus {
  const hasKey = hasServiceRoleKey();
  const mediaStorageEnv = process.env.MEDIA_STORAGE?.trim() || null;
  const vercel = Boolean(process.env.VERCEL);
  const wantsSupabase =
    mediaStorageEnv === "supabase" || vercel || (hasKey && mediaStorageEnv !== "local");
  const remote = useRemoteMediaStorage();

  const catalogSiteRemote = remote;
  let catalogSiteMessage: string | null = null;
  if (remote && !hasKey) {
    catalogSiteMessage = `SUPABASE_SERVICE_ROLE_KEY is missing. Site media uploads and deletes require Supabase on serverless hosts. ${MEDIA_STORAGE_SETUP_STEPS}`;
  } else if (vercel && remote) {
    catalogSiteMessage =
      "New uploads save to Supabase Storage. Bundled repo files can be hidden but not removed from the deployment.";
  } else if (vercel && !remote) {
    catalogSiteMessage =
      "This server cannot write to disk. Configure SUPABASE_SERVICE_ROLE_KEY for Site media uploads.";
  }

  const catalogFields = { catalogSiteRemote, catalogSiteMessage };

  if (mediaStorageEnv === "local") {
    return {
      backend: "local",
      ready: true,
      hasServiceRoleKey: hasKey,
      mediaStorageEnv,
      vercel,
      message: null,
      ...catalogFields,
    };
  }

  if (remote && !hasKey) {
    return {
      backend: "supabase",
      ready: false,
      hasServiceRoleKey: false,
      mediaStorageEnv,
      vercel,
      message: `SUPABASE_SERVICE_ROLE_KEY is missing. ${MEDIA_STORAGE_SETUP_STEPS}`,
      ...catalogFields,
    };
  }

  if (!remote && wantsSupabase && !vercel) {
    return {
      backend: "local",
      ready: true,
      hasServiceRoleKey: hasKey,
      mediaStorageEnv,
      vercel,
      message:
        "Uploads save to public/uploads on this server. For durable cloud storage, add SUPABASE_SERVICE_ROLE_KEY and MEDIA_STORAGE=supabase.",
      ...catalogFields,
    };
  }

  return {
    backend: remote ? "supabase" : "local",
    ready: remote ? hasKey : true,
    hasServiceRoleKey: hasKey,
    mediaStorageEnv,
    vercel,
    message: null,
    ...catalogFields,
  };
}

export function assertMediaStorageReady(): void {
  const status = getMediaStorageStatus();
  if (!status.ready && status.message) {
    throw new Error(status.message);
  }
}

function getMediaBucket(): string {
  return process.env.SUPABASE_MEDIA_BUCKET?.trim() || "media";
}

function getSupabaseProjectUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
}

function getSupabaseAdmin() {
  const url = getSupabaseProjectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase media storage is not configured. In Vercel/Hostinger set SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role), MEDIA_STORAGE=supabase, create a public Storage bucket named media (or run database/postgres/03-storage-media.sql), then redeploy.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isBucketMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("bucket not found") || lower.includes("bucket does not exist");
}

async function ensureMediaBucket(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Supabase storage list buckets failed: ${listError.message}`);
  }

  if (buckets?.some((row) => row.id === bucket || row.name === bucket)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 64 * 1024 * 1024,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(
      `Supabase bucket "${bucket}" is missing and could not be created automatically (${createError.message}). In Supabase Dashboard → Storage → New bucket, create a public bucket named "${bucket}", or run database/postgres/03-storage-media.sql in the SQL Editor.`,
    );
  }

}

async function uploadToSupabase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
  objectPath: string,
  buffer: Buffer,
  contentType: string,
) {
  return supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });
}

export async function storeUploadedFile(
  file: { name: string; type: string },
  buffer: Buffer,
  mediaType: MediaType,
): Promise<StoredUpload> {
  const subDir = SUBDIR[mediaType];
  const storedName = `${Date.now()}-${safeFilename(file.name)}`;
  assertMediaStorageReady();
  const remote = useRemoteMediaStorage();


  if (!remote) {
    const dir = resolve(process.cwd(), UPLOAD_ROOT, subDir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, storedName), buffer);
    return {
      url: `/uploads/${subDir}/${storedName}`,
      storage: "local",
    };
  }

  const objectPath = `${subDir}/${storedName}`;
  const supabase = getSupabaseAdmin();
  const bucket = getMediaBucket();
  const contentType = file.type || "application/octet-stream";

  let { error } = await uploadToSupabase(supabase, bucket, objectPath, buffer, contentType);

  if (error && isBucketMissingError(error.message)) {
    await ensureMediaBucket(supabase, bucket);
    ({ error } = await uploadToSupabase(supabase, bucket, objectPath, buffer, contentType));
  }

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return {
    url: data.publicUrl,
    storage: "supabase",
    objectPath,
  };
}

export async function deleteStoredUpload(url: string): Promise<boolean> {
  if (url.startsWith("/uploads/")) {
    return deleteLocalUploadFile(url);
  }

  const projectUrl = getSupabaseProjectUrl();
  const bucket = getMediaBucket();
  const prefix = `${projectUrl}/storage/v1/object/public/${bucket}/`;
  if (!projectUrl || !url.startsWith(prefix)) return false;

  try {
    const objectPath = url.slice(prefix.length);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    return !error;
  } catch {
    return false;
  }
}
