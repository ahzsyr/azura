import "server-only";

import type { MediaType } from "@prisma/client";
import { SUBDIR, mimeTypeForUpload, safeFilename } from "@/lib/local-media-storage";
import { getLocalPersistenceLayout, isLocalPersistenceInsideDeployRoot } from "@/lib/local-public-path";
import {
  createStorageProvider,
  providerForBackend,
  resolveMediaStorageBackend,
} from "@/lib/storage-providers";
import type { StorageBackend, StorageObjectIdentity } from "@/lib/storage-provider";
import type { MediaStorageStatus, StoredUpload } from "@/lib/media-storage-types";

export type { StoredUpload, MediaStorageStatus } from "@/lib/media-storage-types";

function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function hasS3Credentials(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim(),
  );
}

export const MEDIA_STORAGE_SETUP_STEPS =
  "Set MEDIA_STORAGE=local|supabase|s3. For supabase set SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_URL). " +
  "For s3 set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, optional S3_ENDPOINT / S3_PUBLIC_BASE_URL.";

/** Whether CMS uploads use remote cloud storage. Explicit MEDIA_STORAGE only. */
export function useRemoteMediaStorage(): boolean {
  const backend = resolveMediaStorageBackend();
  return backend === "supabase" || backend === "s3";
}

export function getMediaStorageStatus(): MediaStorageStatus {
  const backend = resolveMediaStorageBackend();
  const hasKey = hasServiceRoleKey();
  const s3Ready = hasS3Credentials();
  const mediaStorageEnv = process.env.MEDIA_STORAGE?.trim() || null;
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  let ready = true;
  let message: string | null = null;
  if (backend === "supabase" && !hasKey) {
    ready = false;
    message = `Supabase storage is not configured. ${MEDIA_STORAGE_SETUP_STEPS}`;
  } else if (backend === "s3" && !s3Ready) {
    ready = false;
    message = `S3 storage is not configured. ${MEDIA_STORAGE_SETUP_STEPS}`;
  }

  const catalogSiteRemote = backend !== "local";
  const catalogSiteMessage =
    catalogSiteRemote && !ready
      ? message
      : backend === "local"
        ? "Uploads save to local disk (MEDIA_STORAGE=local)."
        : null;

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

  return {
    backend,
    ready,
    hasServiceRoleKey: hasKey,
    hasS3Credentials: s3Ready,
    mediaStorageEnv,
    cronSecretConfigured,
    message,
    catalogSiteRemote,
    catalogSiteMessage,
    localUploadsPersistent,
    localPersistenceMode,
    localPersistenceInsideDeploy,
    resolvedUploadsDiskDir: localUploadsPersistent ? layout.resolvedUploadsDiskDir : null,
    publicWholeSymlinkRisk: layout.publicWholeSymlinkRisk,
    publicSymlinkTarget: layout.publicSymlinkTarget,
    publicUploadsSymlinkTarget: layout.publicUploadsSymlinkTarget,
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

  const provider = createStorageProvider();
  const objectKey = `${subDir}/${storedName}`;
  const contentType = mimeTypeForUpload(file.name, file.type, mediaType);
  const result = await provider.upload(buffer, objectKey, contentType);

  return {
    url: result.url,
    storage: result.storage,
    bucket: result.bucket,
    objectKey: result.objectKey,
  };
}

/** Delete by canonical MediaAsset identity (never parse url). */
export async function deleteStoredAsset(identity: {
  storageBackend: string;
  bucket: string;
  objectKey: string;
}): Promise<boolean> {
  if (!identity.objectKey?.trim()) return false;
  const provider = providerForBackend(identity.storageBackend);
  const payload: StorageObjectIdentity = {
    storageBackend: provider.backend,
    bucket: identity.bucket || provider.bucket,
    objectKey: identity.objectKey,
  };
  return provider.deleteObject(payload);
}

/**
 * @deprecated Prefer deleteStoredAsset with persisted identity.
 * Kept for legacy catalog paths that only have a public URL.
 */
export async function deleteStoredUpload(url: string): Promise<boolean> {
  if (url.startsWith("/uploads/")) {
    const objectKey = url.replace(/^\/uploads\//, "");
    return deleteStoredAsset({
      storageBackend: "local",
      bucket: "local",
      objectKey,
    });
  }
  // Cannot safely infer remote identity from url alone — no-op for remote URLs.
  return false;
}

export async function getSignedMediaUrl(
  identity: { storageBackend: StorageBackend; bucket: string; objectKey: string },
  ttlSeconds = 3600,
): Promise<string | null> {
  const provider = providerForBackend(identity.storageBackend);
  if (!provider.getSignedUrl) return null;
  return provider.getSignedUrl(identity.objectKey, ttlSeconds);
}
