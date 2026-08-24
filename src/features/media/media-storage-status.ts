export type MediaStorageStatus = {
  backend: "local" | "supabase";
  ready: boolean;
  hasServiceRoleKey: boolean;
  mediaStorageEnv: string | null;
  vercel: boolean;
  message: string | null;
  /** Site catalog tab uses remote storage when true */
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
