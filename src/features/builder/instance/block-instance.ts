import type { BlockNode, PageBlocks } from "@/types/builder";
import {
  BLOCK_LEGACY_VERSION,
  BLOCK_SYSTEM_VERSION,
  type BlockInstanceV2,
} from "@/types/block-system";
import { blockRegistry } from "@/features/builder/registry/block-registry-system";
import { createBlock } from "@/schemas/blocks";

function isUnsetSettingValue(value: unknown): boolean {
  return value === "" || value === null || value === undefined;
}

/** Read effective settings — merge legacy props with v2 settings (settings win on conflict). */
export function getBlockSettings(block: BlockNode): Record<string, unknown> {
  const props = block.props ?? {};
  const settings = block.settings ?? {};
  const merged = { ...props, ...settings };

  // v2 defaults use empty strings; don't let those mask real values still in props
  for (const key of Object.keys(settings)) {
    const settingVal = settings[key];
    const propVal = props[key];
    if (isUnsetSettingValue(settingVal) && !isUnsetSettingValue(propVal)) {
      merged[key] = propVal;
    }
  }

  return merged;
}

/** Dual-write settings + props so legacy and v2 readers stay in sync */
export function patchBlockSettings(
  block: BlockNode,
  patch: Record<string, unknown>
): BlockNode {
  const settings = { ...getBlockSettings(block), ...patch };
  return {
    ...block,
    settings,
    props: settings,
  };
}

/** Patch block media fields — URL is required; mediaId optional for usage tracking */
export function patchBlockMedia(
  block: BlockNode,
  keys: { urlKey: string; mediaIdKey?: string; typeKey?: string },
  pick: { url: string; mediaId?: string | null },
): BlockNode {
  const patch: Record<string, unknown> = {
    [keys.urlKey]: pick.url,
  };
  if (keys.mediaIdKey) {
    patch[keys.mediaIdKey] = pick.mediaId ?? "";
  }
  if (keys.typeKey && pick.url) {
    patch[keys.typeKey] = "image";
  }
  return patchBlockSettings(block, patch);
}

/** Normalize any stored block to v2 shape in-memory (does not mutate input) */
export function normalizeBlockInstance(block: BlockNode): BlockInstanceV2 {
  const def = blockRegistry.get(block.type);
  const settings = {
    ...(def?.defaultSettings ?? {}),
    ...getBlockSettings(block),
  };

  return {
    id: block.id,
    type: block.type,
    version: BLOCK_SYSTEM_VERSION,
    settings,
    styles: block.styles ?? def?.defaultStyles ?? {},
    responsive: block.responsive ?? def?.defaultResponsive ?? {},
    localization: block.localization ?? {},
    visibility: block.visibility ?? {},
    seo: block.seo ?? {},
    animation: block.animation ?? def?.defaultAnimation ?? { enabled: false },
    visual: block.visual,
    hidden: block.hidden,
    children: block.children?.map(normalizeBlockInstance),
  };
}

export function normalizePageBlocks(blocks: PageBlocks): BlockInstanceV2[] {
  return blocks.map(normalizeBlockInstance);
}

/** Convert v2 instance back to BlockNode for persistence (dual-write props for legacy readers) */
export function toPersistedBlockNode(instance: BlockInstanceV2): BlockNode {
  return {
    id: instance.id,
    type: instance.type,
    version: BLOCK_SYSTEM_VERSION,
    settings: instance.settings,
    props: instance.settings,
    styles: instance.styles,
    responsive: instance.responsive,
    localization: instance.localization,
    visibility: instance.visibility,
    seo: instance.seo,
    animation: instance.animation,
    visual: instance.visual,
    hidden: instance.hidden,
    children: instance.children?.map(toPersistedBlockNode),
  };
}

export function createBlockInstance(
  type: BlockNode["type"],
  overrides: Partial<BlockInstanceV2> = {}
): BlockNode {
  const def = blockRegistry.getOrThrow(type);
  const base = createBlock(type, def.defaultSettings) as BlockNode;
  const instance: BlockInstanceV2 = {
    id: overrides.id ?? base.id,
    type,
    version: BLOCK_SYSTEM_VERSION,
    settings: { ...def.defaultSettings, ...overrides.settings },
    styles: { ...def.defaultStyles, ...overrides.styles },
    responsive: { ...def.defaultResponsive, ...overrides.responsive },
    localization: overrides.localization ?? {},
    visibility: overrides.visibility ?? {},
    seo: overrides.seo ?? {},
    animation: { ...def.defaultAnimation, ...overrides.animation },
    children: overrides.children,
  };
  return toPersistedBlockNode(instance);
}

export function isV2Block(block: BlockNode): boolean {
  return block.version === BLOCK_SYSTEM_VERSION || Boolean(block.settings);
}

export function upgradeBlockToV2(block: BlockNode): BlockNode {
  if (isV2Block(block)) {
    return toPersistedBlockNode(normalizeBlockInstance(block));
  }
  const normalized = normalizeBlockInstance(block);
  return toPersistedBlockNode(normalized);
}

export function upgradePageBlocksToV2(blocks: PageBlocks): PageBlocks {
  return blocks.map(upgradeBlockToV2);
}
