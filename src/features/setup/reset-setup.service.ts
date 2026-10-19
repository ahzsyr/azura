import "server-only";

import { existsSync, readdirSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { resolveLocalUploadsDiskDir } from "@/lib/local-public-path";
import { createStorageProvider } from "@/lib/storage-providers";
import type { StorageBackend } from "@/lib/storage-provider";
import { invalidateSetupStatusCache } from "@/features/setup/setup-middleware-cache";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";
import { writeSystemSettings } from "@/features/setup/setup.service";
import { truncateApplicationTables } from "@/features/setup/application-tables";
import { RESET_SYSTEM_SETTINGS } from "@/features/setup/reset-setup.constants";
import { clearRenderedSiteCache } from "@/features/setup/clear-rendered-site-cache";

const GENERATED_INDEX_DIRS = [
  join(process.cwd(), "seeds", "catalog", "products-index"),
  join(process.cwd(), "public", "data", "products-index"),
] as const;

async function emptyDirectory(dir: string): Promise<void> {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir);
  await Promise.all(entries.map((entry) => rm(join(dir, entry), { recursive: true, force: true })));
}

function isRemoteBackend(value: string): value is Exclude<StorageBackend, "local"> {
  return value === "supabase" || value === "s3";
}

/** Delete cloud objects while MediaAsset rows still exist. Failures are logged; the wipe still proceeds. */
async function deleteRemoteStoredMedia(): Promise<void> {
  const assets = await prisma.mediaAsset.findMany({
    where: {
      storageBackend: { in: ["supabase", "s3"] },
      NOT: { objectKey: "" },
    },
    select: { storageBackend: true, bucket: true, objectKey: true },
  });

  const providers = new Map<string, ReturnType<typeof createStorageProvider>>();
  for (const asset of assets) {
    if (!isRemoteBackend(asset.storageBackend) || !asset.objectKey) continue;
    try {
      let provider = providers.get(asset.storageBackend);
      if (!provider) {
        provider = createStorageProvider(asset.storageBackend);
        providers.set(asset.storageBackend, provider);
      }
      await provider.deleteObject({
        storageBackend: asset.storageBackend,
        bucket: asset.bucket,
        objectKey: asset.objectKey,
      });
    } catch (error) {
      console.warn("[setup reset] remote media delete failed:", asset.objectKey, error);
    }
  }
}

async function clearLocalWebsiteFiles(): Promise<void> {
  await emptyDirectory(resolveLocalUploadsDiskDir());
  for (const dir of GENERATED_INDEX_DIRS) {
    if (!existsSync(dir)) continue;
    // Only clear a directory that is still a directory (not a stray file).
    try {
      readdirSync(dir);
    } catch {
      continue;
    }
    await emptyDirectory(dir);
  }
}

export async function resetSetupWizard(): Promise<void> {
  await deleteRemoteStoredMedia();
  // One transaction keeps FOREIGN_KEY_CHECKS on the same pooled connection.
  await prisma.$transaction(
    async (tx) => {
      await truncateApplicationTables({
        query: async (sql) =>
          (await tx.$queryRawUnsafe(sql)) as Array<Record<string, unknown>>,
        execute: (sql) => tx.$executeRawUnsafe(sql),
      });
    },
    { maxWait: 30_000, timeout: 120_000 },
  );
  try {
    await clearLocalWebsiteFiles();
  } catch (error) {
    console.warn("[setup reset] local file wipe failed:", error);
  }
  await writeSystemSettings({ ...RESET_SYSTEM_SETTINGS });
  invalidateSetupStatusCache();
  await clearRenderedSiteCache();
  await refreshMiddlewareManifestBestEffort("setup reset");
}
