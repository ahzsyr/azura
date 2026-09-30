import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type { PageBlocks } from "@/types/builder";

const NAMESPACE = "preview-tokens";
const TTL_MS = 60 * 60 * 1000;

export type PreviewTokenPayload = {
  pageId: string;
  slug: string;
  blocks: PageBlocks;
  locale: string;
  expiresAt: string;
};

export const previewTokenService = {
  async create(input: {
    pageId: string;
    slug: string;
    blocks: PageBlocks;
    locale?: string;
  }): Promise<string> {
    const token = randomBytes(24).toString("hex");
    const payload: PreviewTokenPayload = {
      ...input,
      locale: input.locale ?? "en",
      expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
    };
    await jsonStoreService.set(NAMESPACE, token, payload as unknown as Prisma.InputJsonValue, { revalidate: true });
    return token;
  },

  async resolve(token: string): Promise<PreviewTokenPayload | null> {
    const payload = await jsonStoreService.get<PreviewTokenPayload>(NAMESPACE, token);
    if (!payload) return null;
    if (new Date(payload.expiresAt).getTime() < Date.now()) {
      await jsonStoreService.delete(NAMESPACE, token);
      return null;
    }
    return payload;
  },

  async revoke(token: string): Promise<void> {
    await jsonStoreService.delete(NAMESPACE, token);
  },
};
