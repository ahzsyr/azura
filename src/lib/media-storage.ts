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

/** Vercel/serverless cannot write to public/uploads — use Supabase Storage instead. */
export function useRemoteMediaStorage(): boolean {
  if (process.env.MEDIA_STORAGE === "local") return false;
  if (process.env.MEDIA_STORAGE === "supabase") return true;
  return Boolean(process.env.VERCEL);
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
      "Supabase media storage is not configured. In Vercel set SUPABASE_SERVICE_ROLE_KEY, create a public Storage bucket named media (or set SUPABASE_MEDIA_BUCKET), then redeploy.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function storeUploadedFile(
  file: { name: string; type: string },
  buffer: Buffer,
  mediaType: MediaType,
): Promise<StoredUpload> {
  const subDir = SUBDIR[mediaType];
  const storedName = `${Date.now()}-${safeFilename(file.name)}`;
  const remote = useRemoteMediaStorage();

  // #region agent log
  import("@/lib/debug-ingest").then(({ debugIngest }) =>
    debugIngest(
      "lib/media-storage.ts:storeUploadedFile",
      "store upload",
      {
        remote,
        vercel: Boolean(process.env.VERCEL),
        mediaType,
        subDir,
        hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      },
      "H1",
    ),
  );
  // #endregion

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
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    // #region agent log
    import("@/lib/debug-ingest").then(({ debugIngest }) =>
      debugIngest(
        "lib/media-storage.ts:storeUploadedFile",
        "supabase upload failed",
        { bucket, objectPath, code: error.name, message: error.message.slice(0, 200) },
        "H3",
      ),
    );
    // #endregion
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
