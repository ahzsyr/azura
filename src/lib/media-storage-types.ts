export type StoredUpload = {
  url: string;
  storage: "local" | "supabase";
  objectPath?: string;
};

export type MediaStorageStatus = {
  backend: "local" | "supabase";
  ready: boolean;
  hasServiceRoleKey: boolean;
  mediaStorageEnv: string | null;
  vercel: boolean;
  message: string | null;
  catalogSiteRemote: boolean;
  catalogSiteMessage: string | null;
};
