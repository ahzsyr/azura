import type { RegionId } from "@/features/layout-engine/types";

const EDITOR_REGION_IDS = new Set<RegionId>(["top", "primary", "asideStart", "asideEnd"]);

/** Update the address bar without triggering a Next.js RSC navigation (keeps client form state). */
export function replaceBrowserUrl(url: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", url);
}

/** Cosmetic URL updates (hash tabs) — avoids Next.js router sync via null history state. */
export function replaceEditorHashUrl(path: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", path);
}

type EditorSaveRouter = {
  replace: (url: string, options?: { scroll?: boolean }) => void;
  refresh: () => void;
};

/**
 * Sync editor URL after save without remounting when staying on the same entity route.
 * Uses router.replace only when pathname changes (e.g. first save creating a new id).
 */
export function applyEditorSaveNavigation(
  redirectTo: string,
  router: EditorSaveRouter,
  options?: { useHashUrl?: boolean },
): void {
  if (typeof window === "undefined") return;

  if (options?.useHashUrl) {
    replaceEditorHashUrl(redirectTo);
  } else {
    replaceBrowserUrl(redirectTo);
  }

  const next = new URL(redirectTo, window.location.origin);
  const current = new URL(window.location.href);
  if (next.pathname !== current.pathname) {
    router.replace(redirectTo, { scroll: false });
    return;
  }
  router.refresh();
}

export function isEditorRegionId(value: string | null | undefined): value is RegionId {
  return value != null && EDITOR_REGION_IDS.has(value as RegionId);
}

export function readEditorRegionParam(): RegionId | null {
  if (typeof window === "undefined") return null;
  const region = new URLSearchParams(window.location.search).get("region");
  return isEditorRegionId(region) ? region : null;
}

export function buildEditorRedirectQuery(params: {
  tab: string;
  block?: string | null;
  inspector?: string | null;
  region?: string | null;
}): string {
  const qs = new URLSearchParams({ tab: params.tab });
  if (params.block) qs.set("block", params.block);
  if (params.inspector) qs.set("inspector", params.inspector);
  if (params.region && isEditorRegionId(params.region)) qs.set("region", params.region);
  return qs.toString();
}

export function readEditorHashTab(allowedIds: ReadonlySet<string>, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash && allowedIds.has(hash)) return hash;
  const legacyTab = new URLSearchParams(window.location.search).get("tab");
  if (legacyTab && allowedIds.has(legacyTab)) return legacyTab;
  return fallback;
}

export function readEditorContentQueryParams(): {
  block: string | null;
  inspector: string | null;
  region: RegionId | null;
} {
  if (typeof window === "undefined") {
    return { block: null, inspector: null, region: null };
  }
  const qs = new URLSearchParams(window.location.search);
  const region = qs.get("region");
  return {
    block: qs.get("block"),
    inspector: qs.get("inspector"),
    region: isEditorRegionId(region) ? region : null,
  };
}

export function buildPostEditorPath(
  postId: string,
  tabId: string,
  blockId: string | null,
  inspector: string | null,
  region?: string | null,
): string {
  const params = new URLSearchParams();
  if (tabId === "content") {
    if (blockId) params.set("block", blockId);
    if (inspector) params.set("inspector", inspector);
    if (region && isEditorRegionId(region)) params.set("region", region);
  }
  const qs = params.toString();
  return `/admin/posts/${postId}${qs ? `?${qs}` : ""}#${tabId}`;
}

/** Server-side redirect path after post save (hash tab + optional content query). */
export function buildPostEditorRedirectPath(
  postId: string,
  tabId: string,
  blockId?: string | null,
  inspector?: string | null,
  region?: string | null,
): string {
  return buildPostEditorPath(postId, tabId, blockId ?? null, inspector ?? null, region ?? null);
}
