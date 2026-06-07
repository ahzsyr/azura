import type { FuseResult } from "fuse.js";
import type { ProductListingRecord } from "./types";

type ListingFuse = import("fuse.js").default<ProductListingRecord>;

let fuseCache: { key: string; fuse: ListingFuse } | null = null;
let fuseModulePromise: Promise<typeof import("fuse.js")> | null = null;

function loadFuseModule() {
  if (!fuseModulePromise) fuseModulePromise = import("fuse.js");
  return fuseModulePromise;
}

function fuseThreshold(fuzziness: number): number {
  if (fuzziness <= 0.2) return 0.25;
  if (fuzziness >= 0.5) return 0.45;
  return 0.35;
}

async function getListingFuse(records: ProductListingRecord[], fuzziness: number): Promise<ListingFuse> {
  const key = `${records.length}:${fuzziness}`;
  if (fuseCache?.key === key) return fuseCache.fuse;

  const { default: Fuse } = await loadFuseModule();
  const fuse = new Fuse(records, {
    keys: [
      { name: "name", weight: 0.45 },
      { name: "searchText", weight: 0.35 },
      { name: "brand", weight: 0.1 },
      { name: "category", weight: 0.05 },
      { name: "tags", weight: 0.05 },
    ],
    threshold: fuseThreshold(fuzziness),
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
  fuseCache = { key, fuse };
  return fuse;
}

export async function fuzzyMatchListingSlugs(
  records: ProductListingRecord[],
  query: string,
  fuzziness = 0.35,
): Promise<Set<string>> {
  const q = query.trim();
  if (!q) return new Set();
  try {
    const fuse = await getListingFuse(records, fuzziness);
    const hits: FuseResult<ProductListingRecord>[] = fuse.search(q, { limit: records.length });
    return new Set(hits.map((h) => h.item.slug));
  } catch {
    const ql = q.toLowerCase();
    return new Set(records.filter((r) => r.searchText.includes(ql)).map((r) => r.slug));
  }
}
