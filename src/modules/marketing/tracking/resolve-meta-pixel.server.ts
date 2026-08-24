import "server-only";

import { prisma } from "@/lib/prisma";
import {
  normalizeMetaPixelId,
  readMetaPixelHeadSnippet,
  extractMetaPixelIdFromSnippet,
} from "@/modules/marketing/tracking/meta-pixel";

export type ActiveMetaPixel = {
  pixelId: string;
  headSnippet?: string;
};

/** Resolve Meta Pixel for public-site injection when Tracking → Meta is enabled. */
export async function resolveActiveMetaPixel(): Promise<ActiveMetaPixel | null> {
  const row = await prisma.marketingTrackingConfig
    .findUnique({ where: { providerId: "meta" } })
    .catch(() => null);

  if (!row?.enabled) return null;

  const fromSnippet = readMetaPixelHeadSnippet(row.metadata);
  const pixelId =
    normalizeMetaPixelId(row.pixelId) ??
    (fromSnippet ? extractMetaPixelIdFromSnippet(fromSnippet) : undefined);


  if (!pixelId) return null;

  return {
    pixelId,
    headSnippet: fromSnippet,
  };
}
