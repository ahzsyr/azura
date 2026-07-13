import "server-only";

import type { CmsPagePublicView } from "@/features/cms/cms.service";
import { loadCachedHomePage } from "@/features/cms/load-home-page";
import { resolvePublishedPageStale } from "@/features/cms/resolve-published-page";
import { getErrorMessage } from "@/lib/debug/recoverable-db-error";

export type HomePageResolution =
  | { kind: "cms"; page: CmsPagePublicView; source: "live" | "stale" }
  | { kind: "fallback" };

type ResolveHomePageOptions = {
  /** Skip live DB fetch (e.g. after a recoverable render failure). */
  skipLive?: boolean;
};

/** Homepage: live CMS → stale pageCache → static fallback landing. */
export async function resolveHomePage(
  options: ResolveHomePageOptions = {},
): Promise<HomePageResolution> {
  if (!options.skipLive) {
    try {
      const live = await loadCachedHomePage();
      if (live) {
        return { kind: "cms", page: live, source: "live" };
      }
    } catch (error) {
      console.error("[cms/home] loadCachedHomePage failed:", getErrorMessage(error));
    }
  }

  const stale = await resolvePublishedPageStale("home");
  if (stale) {
    console.warn("[cms/home] serving stale page-cache for /home");
    return { kind: "cms", page: stale, source: "stale" };
  }

  console.warn("[cms/home] no live or stale home page — using static fallback landing");
  return { kind: "fallback" };
}
