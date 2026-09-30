import { pageBlocksSchema } from "@/schemas/blocks";
import type { PageBlocks } from "@/types/builder";
import { migrateBlocksToBlockSystem } from "./migration/upgrade-blocks";
import type { ZodError } from "zod";

function formatBlocksValidationError(error: ZodError, blocks: PageBlocks): string {
  const issues = error.issues.slice(0, 3).map((issue) => {
    const path = issue.path.map(String).join(".");
    const indexMatch = path.match(/^(\d+)/);
    const blockId = indexMatch != null ? blocks[Number(indexMatch[1])]?.id : undefined;
    const blockLabel = blockId ? `Block ${blockId}` : "Blocks";
    const field = path.replace(/^\d+\.?/, "") || "structure";
    return `${blockLabel} (${field}): ${issue.message}`;
  });
  const suffix = error.issues.length > 3 ? ` (+${error.issues.length - 3} more)` : "";
  return `Could not save blocks. ${issues.join(" ")}${suffix}`;
}

/** Client-safe block validation (no server-only cache/json-store imports). */
export function validatePageBlocks(blocks: unknown): PageBlocks {
  const raw = Array.isArray(blocks) ? (blocks as PageBlocks) : [];
  const { blocks: migrated } = migrateBlocksToBlockSystem(raw);
  const result = pageBlocksSchema.safeParse(migrated);
  if (!result.success) {
    throw new Error(formatBlocksValidationError(result.error, migrated));
  }
  return result.data as PageBlocks;
}
