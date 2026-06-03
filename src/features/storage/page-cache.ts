import { jsonStoreService } from "./json-store.service";
import type { PageBlocks } from "@/types/builder";

export type CachedPagePayload = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  blocks: PageBlocks;
  updatedAt: string;
};

const NAMESPACE = "page-cache" as const;

export const pageCache = {
  async get(slug: string): Promise<CachedPagePayload | null> {
    return jsonStoreService.getCached<CachedPagePayload>(NAMESPACE, slug);
  },

  async set(payload: CachedPagePayload) {
    await jsonStoreService.set(NAMESPACE, payload.slug, payload as unknown as import("@prisma/client").Prisma.InputJsonValue);
  },

  async invalidate(slug: string) {
    try {
      await jsonStoreService.delete(NAMESPACE, slug);
    } catch {
      // missing key is fine
    }
  },
};
