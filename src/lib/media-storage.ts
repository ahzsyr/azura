import "server-only";

import type { MediaType } from "@prisma/client";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { SUBDIR, safeFilename } from "@/lib/local-media-storage";
import { getLocalPersistenceLayout, isLocalPersistenceInsideDeployRoot } from "@/lib/local-public-path";
import { createStorageProvider } from "@/lib/storage-providers";
import type { MediaStorageStatus, StoredUpload } from "@/lib/media-storage-types";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";

export type { StoredUpload, MediaStorageStatus } from "@/lib/media-storage-types";

function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export const MEDIA_STORAGE_SETUP_STEPS =
  "Set MEDIA_STORAGE=supabase, add your cloud storage credentials to the deployment environment, " +
  "run database/postgres/03-storage-media.sql once if needed, then redeploy.";

/** Whether CMS uploads use remote cloud storage (requires storage credentials). */
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
    catalogSiteMessage = `Cloud storage is not configured. Site media uploads and deletes require remote storage on serverless hosts. ${MEDIA_STORAGE_SETUP_STEPS}`;
  } else if (vercel && remote) {
    catalogSiteMessage =
      "New uploads save to cloud storage. Bundled repo files can be hidden but not removed from the deployment.";
  } else if (vercel && !remote) {
    catalogSiteMessage =
      "This server cannot write to disk. Configure cloud storage for Site media uploads.";
  }

  const catalogFields = { catalogSiteRemote, catalogSiteMessage };
  const localPublicDir = process.env.LOCAL_PUBLIC_DIR?.trim();
  const localUploadsDir = process.env.LOCAL_UPLOADS_DIR?.trim();
  const localUploadsPersistent = Boolean(localPublicDir || localUploadsDir);
  const localPersistenceMode: MediaStorageStatus["localPersistenceMode"] = localPublicDir
    ? "public"
    : localUploadsDir
      ? "uploads"
      : null;
  const localPersistenceInsideDeploy = isLocalPersistenceInsideDeployRoot();
  const layout = getLocalPersistenceLayout();
  const persistenceFields = {
    localUploadsPersistent,
    localPersistenceMode,
    localPersistenceInsideDeploy,
    resolvedUploadsDiskDir: localUploadsPersistent ? layout.resolvedUploadsDiskDir : null,
    publicWholeSymlinkRisk: layout.publicWholeSymlinkRisk,
    publicSymlinkTarget: layout.publicSymlinkTarget,
    publicUploadsSymlinkTarget: layout.publicUploadsSymlinkTarget,
  };

  if (mediaStorageEnv === "local" && !isCloudNativeProduction()) {
    return {
      backend: "local",
      ready: true,
      hasServiceRoleKey: hasKey,
      mediaStorageEnv,
      vercel,
      message: null,
      ...catalogFields,
      ...persistenceFields,
    };
  }

  if (remote && !hasKey) {
    return {
      backend: "supabase",
      ready: false,
      hasServiceRoleKey: false,
      mediaStorageEnv,
      vercel,
      message: `Cloud storage is not configured. ${MEDIA_STORAGE_SETUP_STEPS}`,
      ...catalogFields,
      ...persistenceFields,
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
        "Uploads save to public/uploads on this server. For durable cloud storage, configure MEDIA_STORAGE and your storage credentials.",
      ...catalogFields,
      ...persistenceFields,
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
    ...persistenceFields,
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
