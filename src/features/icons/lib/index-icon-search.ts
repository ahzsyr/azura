import "server-only";

import { searchIndexer } from "@/capabilities/search/search-indexer.service";

export type IconSearchPayload = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  source: string;
  tags?: unknown;
};

export async function indexIconSearch(icon: IconSearchPayload) {
  try {
    await searchIndexer.indexIcon(icon);
  } catch (error) {
    console.error("[icons] search index failed:", error);
  }
}

export async function removeIconSearch(iconId: string) {
  try {
    await searchIndexer.remove("ICON", iconId);
  } catch (error) {
    console.error("[icons] search remove failed:", error);
  }
}
