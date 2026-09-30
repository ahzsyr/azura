import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import type { Collection } from "./types";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadCollectionsFromFs(localePrefix: string): Promise<Collection[]> {
  const { collectionsDataService } = await import("./collections-data.service");
  return collectionsDataService.loadAll({ localePrefix });
}

export async function collectionsJsonExists(): Promise<boolean> {
  if (isCloudNativeProduction()) return false;
  return fileExists(join(catalogSeedRoot(), "collections.json"));
}
