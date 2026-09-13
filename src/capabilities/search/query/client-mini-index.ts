import Fuse from "fuse.js";
import { normalizeSearchQuery } from "@/capabilities/search/query/normalize-search-query";

export type ClientMiniIndexRecord = {
  id: string;
  title: string;
  snippet?: string;
  urlPath: string;
  searchText: string;
};

const MAX_MINI_INDEX_SIZE = 500;

let cachedIndex: Fuse<ClientMiniIndexRecord> | null = null;
let cachedRecords: ClientMiniIndexRecord[] = [];

export function buildClientMiniIndex(records: ClientMiniIndexRecord[]): boolean {
  if (records.length === 0 || records.length > MAX_MINI_INDEX_SIZE) {
    cachedIndex = null;
    cachedRecords = [];
    return false;
  }
  cachedRecords = records;
  cachedIndex = new Fuse(records, {
    keys: ["title", "snippet", "searchText"],
    threshold: 0.35,
    ignoreLocation: true,
  });
  return true;
}

export function queryClientMiniIndex(q: string, limit = 20): ClientMiniIndexRecord[] {
  if (!cachedIndex) return [];
  const norm = normalizeSearchQuery(q);
  if (!norm) return [];
  return cachedIndex.search(norm, { limit }).map((hit) => hit.item);
}

export function getClientMiniIndexSize(): number {
  return cachedRecords.length;
}

export function clearClientMiniIndex(): void {
  cachedIndex = null;
  cachedRecords = [];
}
