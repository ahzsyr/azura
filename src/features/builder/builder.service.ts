import { jsonStoreService } from "@/features/storage/json-store.service";
import type { Prisma } from "@prisma/client";
import { createBlock } from "@/schemas/blocks";
import type { BlockNode, PageBlocks } from "@/types/builder";
import {
  BLOCK_PRESETS_NAMESPACE,
  BLOCK_TEMPLATES_NAMESPACE,
  BUILTIN_PAGE_TEMPLATES,
  type BlockPresetRecord,
  type PageTemplateRecord,
} from "./constants";
import { cloneBlocks } from "./block-tree";
import { migrateBlocksToBlockSystem } from "./migration/upgrade-blocks";
import { validatePageBlocks } from "./validate-page-blocks";

export const builderService = {
  validateBlocks: validatePageBlocks,

  migrateBlocks(blocks: unknown) {
    return migrateBlocksToBlockSystem(blocks);
  },

  async listBlockPresets(): Promise<Record<string, BlockPresetRecord>> {
    const rows = await jsonStoreService.listNamespace(BLOCK_PRESETS_NAMESPACE);
    return Object.fromEntries(
      rows.map((r) => [r.key, r.data as BlockPresetRecord])
    );
  },

  async saveBlockPreset(key: string, preset: BlockPresetRecord) {
    await jsonStoreService.set(BLOCK_PRESETS_NAMESPACE, key, {
      ...preset,
      createdAt: new Date().toISOString(),
    } as Prisma.InputJsonValue, { revalidate: true });
  },

  async deleteBlockPreset(key: string) {
    const { jsonStoreRepository } = await import("@/repositories/json-store.repository");
    await jsonStoreRepository.delete(BLOCK_PRESETS_NAMESPACE, key);
  },

  async listPageTemplates(): Promise<Record<string, PageTemplateRecord>> {
    const custom = await jsonStoreService.listNamespace(BLOCK_TEMPLATES_NAMESPACE);
    const customMap = Object.fromEntries(
      custom.map((r) => [r.key, r.data as PageTemplateRecord])
    );
    return { ...BUILTIN_PAGE_TEMPLATES, ...customMap };
  },

  async savePageTemplate(key: string, template: PageTemplateRecord) {
    await jsonStoreService.set(BLOCK_TEMPLATES_NAMESPACE, key, template as Prisma.InputJsonValue, { revalidate: true });
  },

  getBuiltinTemplates() {
    return BUILTIN_PAGE_TEMPLATES;
  },

  presetToBlock(preset: BlockPresetRecord): BlockNode {
    return createBlock(preset.type as BlockNode["type"], preset.props) as BlockNode;
  },

  applyTemplate(blocks: PageBlocks): PageBlocks {
    return cloneBlocks(blocks);
  },
};
