export type CardPersonalizationHighlight = "recent" | "recommended" | "trending";

export type CardPersonalizationFlags = {
  recent?: boolean;
  recommended?: boolean;
  trending?: boolean;
};

/** Map listing/search highlight hints to product card personalization flags. */
export function resolveCardPersonalizationFlags(
  highlight?: CardPersonalizationHighlight | null,
): CardPersonalizationFlags | undefined {
  if (highlight === "recent") return { recent: true };
  if (highlight === "recommended") return { recommended: true };
  if (highlight === "trending") return { trending: true };
  return undefined;
}

/** Search ranking boost weight for recently viewed entities (client-side reorder). */
export function rankingBoostForSearch(): number {
  return 1;
}
