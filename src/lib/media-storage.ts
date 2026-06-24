import "server-only";

import type { MediaType } from "@prisma/client";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { SUBDIR, safeFilename } from "@/lib/local-media-storage";
import { createStorageProvider } from "@/lib/storage-providers";
import type { MediaStorageStatus, StoredUpload } from "@/lib/media-storage-types";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";

export type { StoredUpload, MediaStorageStatus } from "@/lib/media-storage-types";

function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export const MEDIA_STORAGE_SETUP_STEPS =
  "Supabase Dashboard → Project Settings → API → copy the service_role secret (not anon). " +
  "Add SUPABASE_SERVICE_ROLE_KEY to Hostinger/Vercel env, set MEDIA_STORAGE=supabase, run database/postgres/03-storage-media.sql once, then redeploy.";

/** Whether CMS uploads use Supabase Storage (requires SUPABASE_SERVICE_ROLE_KEY). */
export function useRemoteMediaStorage(): boolean {
  if (process.env.MEDIA_STORAGE === "local" && !isCloudNativeProduction()) return false;
  if (isCloudNativeProduction()) return true;
  if (hasServiceRoleKey()) return true;
  if (process.env.MEDIA_STORAGE === "supabase") return true;
  if (useDatabaseOnlyCatalog() && process.env.MEDIA_STORAGE !== "local") return true;
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

  if (mediaStorageEnv === "local" && !isCloudNativeProduction()) {
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

export async function storeUploadedFile(
  file: { name: string; type: string },
  buffer: Buffer,
  mediaType: MediaType,
): Promise<StoredUpload> {
  const subDir = SUBDIR[mediaType];
  const storedName = `${Date.now()}-${safeFilename(file.name)}`;
  assertMediaStorageReady();

  const provider = createStorageProvider(useRemoteMediaStorage());
  const objectPath = `${subDir}/${storedName}`;
  const contentType = file.type || "application/octet-stream";
  const result = await provider.upload(buffer, objectPath, contentType);

  return {
    url: result.url,
    storage: result.storage,
    objectPath: result.objectPath,
  };
}

export async function deleteStoredUpload(url: string): Promise<boolean> {
  if (url.startsWith("/uploads/") && !useRemoteMediaStorage()) {
    return createStorageProvider(false).delete(url);
  }

  const remote = createStorageProvider(true);
  if (await remote.delete(url)) return true;

  if (url.startsWith("/uploads/")) {
    return createStorageProvider(false).delete(url);
  }

  return false;
}
