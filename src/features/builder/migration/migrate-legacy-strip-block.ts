import type { BlockNode, PageBlocks } from "@/types/builder";
import {
  announcementBarPropsSchema,
  DEFAULT_ANNOUNCEMENT_BAR_PROPS,
} from "@/features/announcement-bar/announcement-bar.schema";
import { safeParseProps } from "@/lib/zod/safe-parse-props";

type LegacyDiscriminantBlock = {
  discriminant?: string;
  value?: Record<string, unknown>;
};

const STRIP_BLOCK_ALIASES = new Set(["strip-block", "stripBlock"]);

function isStripBlockType(type: string): boolean {
  return STRIP_BLOCK_ALIASES.has(type);
}

function extractStripSettings(raw: Record<string, unknown>): Record<string, unknown> {
  const {
    variant,
    barTone,
    scrollSpeed,
    direction,
    pauseOnHover,
    showEdgeFade,
    separator,
    items,
    visual,
    layout,
    animations,
    interactive,
    responsive,
    advanced,
    id,
    ...rest
  } = raw;

  const settings: Record<string, unknown> = {
    ...(variant != null ? { variant } : {}),
    ...(barTone != null ? { barTone } : {}),
    ...(scrollSpeed != null ? { scrollSpeed } : {}),
    ...(direction != null ? { direction } : {}),
    ...(pauseOnHover != null ? { pauseOnHover } : {}),
    ...(showEdgeFade != null ? { showEdgeFade } : {}),
    ...(separator != null ? { separator } : {}),
    ...(items != null ? { items } : {}),
    ...(visual != null ? { visual } : {}),
    ...(layout != null ? { layout } : {}),
    ...(animations != null ? { animations } : {}),
    ...(interactive != null ? { interactive } : {}),
    ...(responsive != null ? { responsive } : {}),
    ...(advanced != null ? { advanced } : {}),
    ...rest,
  };

  return safeParseProps(
    announcementBarPropsSchema,
    settings,
    DEFAULT_ANNOUNCEMENT_BAR_PROPS,
    "migrateLegacyStripBlock",
  );
}

function migrateOneBlock(block: unknown): BlockNode | null {
  if (!block || typeof block !== "object") return null;

  const legacy = block as LegacyDiscriminantBlock & BlockNode;

  if (legacy.discriminant === "strip-block" && legacy.value) {
    const id =
      typeof legacy.value.id === "string" && legacy.value.id
        ? legacy.value.id
        : crypto.randomUUID();
    const settings = extractStripSettings(legacy.value);
    return {
      id,
      type: "announcementBar",
      version: "2.0",
      props: settings,
      settings,
    };
  }

  if (isStripBlockType(legacy.type)) {
    const source = (legacy.settings ?? legacy.props ?? {}) as Record<string, unknown>;
    const id = legacy.id || (typeof source.id === "string" ? source.id : crypto.randomUUID());
    const settings = extractStripSettings(source);
    return {
      ...legacy,
      id,
      type: "announcementBar",
      version: "2.0",
      props: settings,
      settings,
    };
  }

  return legacy as BlockNode;
}

function migrateBlockTree(block: BlockNode): BlockNode {
  const migrated = migrateOneBlock(block);
  const next = (migrated ?? block) as BlockNode;
  if (next.children?.length) {
    return { ...next, children: next.children.map(migrateBlockTree) };
  }
  return next;
}

export function migrateLegacyStripBlocks(blocks: PageBlocks): PageBlocks {
  return blocks.map((block) => migrateBlockTree(block));
}

export function stripBlocksWereMigrated(before: PageBlocks, after: PageBlocks): boolean {
  const beforeHasStrip = before.some(
    (b) =>
      (b as LegacyDiscriminantBlock).discriminant === "strip-block" ||
      isStripBlockType(b.type),
  );
  const afterHasStrip = after.some(
    (b) =>
      (b as LegacyDiscriminantBlock).discriminant === "strip-block" ||
      isStripBlockType(b.type),
  );
  return beforeHasStrip && !afterHasStrip;
}
