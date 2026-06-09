import type { BlockNode, PageBlocks } from "@/types/builder";
import { upgradeBlockToV2, upgradePageBlocksToV2 } from "@/features/builder/instance/block-instance";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import {
  migrateLegacyStripBlocks,
  stripBlocksWereMigrated,
} from "@/features/builder/migration/migrate-legacy-strip-block";
import { blockInstanceV2Schema, pageBlockInstancesSchema } from "@/schemas/block-system";

export type MigrationResult = {
  blocks: PageBlocks;
  migrated: boolean;
  version: string;
  warnings: string[];
};

/**
 * Full migration pipeline: legacy catalog types → v2 instance schema.
 * Safe to run on every load; idempotent for already-migrated pages.
 */
export function migrateBlocksToBlockSystem(blocks: unknown): MigrationResult {
  const warnings: string[] = [];
  const raw = Array.isArray(blocks) ? (blocks as PageBlocks) : [];

  const catalogMigrated = migrateLegacyCatalogBlocks(raw);
  if (catalogMigrated !== raw) {
    warnings.push("Migrated legacy packages/hotels/services blocks to catalog.");
  }

  const stripMigrated = migrateLegacyStripBlocks(catalogMigrated);
  if (stripBlocksWereMigrated(catalogMigrated, stripMigrated)) {
    warnings.push("Migrated legacy strip-block entries to announcementBar.");
  }

  const v2Upgraded = upgradePageBlocksToV2(stripMigrated);
  const hadV1Only = catalogMigrated.some(
    (b) => !b.version || b.version !== "2.0"
  );

  for (const block of v2Upgraded) {
    validateBlockRecursive(block, warnings);
  }

  return {
    blocks: v2Upgraded,
    migrated: hadV1Only || catalogMigrated !== raw || stripMigrated !== catalogMigrated,
    version: "2.0",
    warnings,
  };
}

function validateBlockRecursive(block: BlockNode, warnings: string[]) {
  const parsed = blockInstanceV2Schema.safeParse({
    ...block,
    settings: block.settings ?? block.props,
    version: "2.0",
  });
  if (!parsed.success) {
    warnings.push(`Block ${block.id} (${block.type}): ${parsed.error.message}`);
  }
  block.children?.forEach((c) => validateBlockRecursive(c, warnings));
}

export function exportBlockInstance(block: BlockNode): string {
  return JSON.stringify(upgradeBlockToV2(block), null, 2);
}

export function importBlockInstance(json: string): BlockNode {
  const parsed = JSON.parse(json) as BlockNode;
  const result = migrateBlocksToBlockSystem([parsed]);
  return result.blocks[0]!;
}

export function parsePageBlocksExport(json: string): PageBlocks {
  const parsed = JSON.parse(json) as unknown;
  return migrateBlocksToBlockSystem(parsed).blocks;
}

export { pageBlockInstancesSchema };
