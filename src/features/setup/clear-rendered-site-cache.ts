import { rm } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePublicShell, revalidateSearch, revalidateSitemap } from "@/services/cache";

const FETCH_CACHE_DIRS = [
  join(process.cwd(), ".next", "cache", "fetch-cache"),
  join(process.cwd(), ".next", "dev", "cache", "fetch-cache"),
] as const;

/** Drop cached pages, theme, and header branding left from the previous install. */
export async function clearRenderedSiteCache(): Promise<void> {
  await Promise.all(
    FETCH_CACHE_DIRS.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  revalidatePublicShell();
  revalidateSearch();
  revalidateSitemap();
}
