import type { StorageProvider } from "./types";

export const STORAGE_PROVIDERS: Record<string, StorageProvider> = {
  mysql: {
    id: "mysql",
    displayName: "MySQL",
    kind: "relational",
  },
  "json-store": {
    id: "json-store",
    displayName: "JSON Store",
    kind: "document",
  },
} as const;
