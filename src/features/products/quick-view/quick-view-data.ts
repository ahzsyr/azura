import type { QuickViewData } from "./quick-view-types";

const cache = new Map<string, QuickViewData>();
const inflight = new Map<string, Promise<QuickViewData>>();

function cacheKey(slug: string, locale: string): string {
  return `${locale}:${slug.toLowerCase()}`;
}

export function getCachedQuickViewData(slug: string, locale: string): QuickViewData | null {
  return cache.get(cacheKey(slug, locale)) ?? null;
}

export async function fetchQuickViewData(slug: string, locale: string): Promise<QuickViewData> {
  const key = cacheKey(slug, locale);
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetch(
    `/api/products/${encodeURIComponent(slug)}/card-preview?locale=${encodeURIComponent(locale)}`,
  )
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to load preview");
      return res.json() as Promise<QuickViewData>;
    })
    .then((data) => {
      cache.set(key, data);
      inflight.delete(key);
      return data;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export function prefetchQuickViewData(slug: string, locale: string): void {
  void fetchQuickViewData(slug, locale).catch(() => undefined);
}

let modalPreloaded = false;

export function preloadQuickViewModal(): void {
  if (modalPreloaded) return;
  modalPreloaded = true;
  void import("./product-quick-view-modal");
}
