"use server";

import { requireAdmin } from "@/features/auth/guards";
import { searchIndexer } from "./search-indexer.service";

export type RebuildSearchIndexResult =
  | {
      ok: true;
      documents: number;
      byEntityType: Record<string, number>;
      warnings: string[];
    }
  | { ok: false; error: string };

export async function rebuildSearchIndex(): Promise<RebuildSearchIndexResult> {
  await requireAdmin();
  try {
    const result = await searchIndexer.rebuildAll();
    return {
      ok: true,
      documents: result.documents,
      byEntityType: result.byEntityType,
      warnings: result.warnings,
    };
  } catch (e) {
    if (e instanceof AggregateError && e.errors.length) {
      const first = e.errors[0];
      const extra = e.errors.length > 1 ? ` (+${e.errors.length - 1} more)` : "";
      return {
        ok: false,
        error: `${first instanceof Error ? first.message : String(first)}${extra}`,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Rebuild failed",
    };
  }
}
