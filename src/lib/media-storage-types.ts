import type { StorageBackend } from "@/lib/storage-provider";

export type StoredUpload = {
  url: string;
  storage: StorageBackend;
  bucket: string;
  objectKey: string;
};

export type MediaStorageStatus = {
  backend: StorageBackend;
  ready: boolean;
  hasServiceRoleKey: boolean;
  hasS3Credentials: boolean;
  mediaStorageEnv: string | null;
  cronSecretConfigured: boolean;
  message: string | null;
  catalogSiteRemote: boolean;
  catalogSiteMessage: string | null;
  /** True when LOCAL_PUBLIC_DIR or LOCAL_UPLOADS_DIR symlinks persist disk media */
  localUploadsPersistent: boolean;
  /** Which persistent symlink mode is active on the server */
  localPersistenceMode: "public" | "uploads" | null;
  /** True when persistence path is inside the deploy folder (uploads lost on redeploy) */
  localPersistenceInsideDeploy: boolean;
  /** Absolute disk path where CMS uploads are written */
  resolvedUploadsDiskDir: string | null;
  /** True when entire public/ is symlinked (unsafe with Git Deploy) */
  publicWholeSymlinkRisk: boolean;
  publicSymlinkTarget: string | null;
  publicUploadsSymlinkTarget: string | null;
};
