"use server";

import { requireAdmin } from "@/features/auth/guards";
import { searchIndexer } from "./search-indexer.service";

export async function rebuildSearchIndex() {
  await requireAdmin();
  await searchIndexer.rebuildAll();
}
