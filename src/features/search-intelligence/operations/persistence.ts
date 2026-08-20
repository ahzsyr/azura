import "server-only";

import type { Prisma } from "@prisma/client";
import { jsonStoreRepository } from "@/repositories/json-store.repository";
import { SEO_SEARCH_OPS_NAMESPACE } from "@/features/seo/constants";
import type { ExecutionRecord } from "./types";

const RECORDS_KEY = "execution-records";
const SITEMAP_SNAPSHOT_KEY = "sitemap-snapshot";
const MAX_RECORDS = 200;

export type SitemapUrlSnapshot = {
  urls: string[];
  count: number;
  generatedAt: string;
};

export async function loadExecutionRecords(): Promise<ExecutionRecord[]> {
  const data = await jsonStoreRepository.get<{ records?: ExecutionRecord[] }>(
    SEO_SEARCH_OPS_NAMESPACE,
    RECORDS_KEY,
  );
  return Array.isArray(data?.records) ? data.records : [];
}

export async function saveExecutionRecords(records: ExecutionRecord[]): Promise<void> {
  const trimmed = [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_RECORDS);
  await jsonStoreRepository.set(SEO_SEARCH_OPS_NAMESPACE, RECORDS_KEY, {
    records: trimmed,
    updatedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue);
}

export async function loadSitemapSnapshot(): Promise<SitemapUrlSnapshot | null> {
  return jsonStoreRepository.get<SitemapUrlSnapshot>(SEO_SEARCH_OPS_NAMESPACE, SITEMAP_SNAPSHOT_KEY);
}

export async function saveSitemapSnapshot(snapshot: SitemapUrlSnapshot): Promise<void> {
  await jsonStoreRepository.set(
    SEO_SEARCH_OPS_NAMESPACE,
    SITEMAP_SNAPSHOT_KEY,
    snapshot as unknown as Prisma.InputJsonValue,
  );
}
