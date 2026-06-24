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
};
