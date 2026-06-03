import type { BlockType } from "@/types/builder";
import type { BlockCategory } from "@/types/block-system";
import { blockRegistry } from "@/features/builder/registry/block-registry-system";

export type { BlockCategory };

export type BlockTypeMeta = {
  type: BlockType;
  label: string;
  icon: string;
  category: BlockCategory;
  description: string;
  version?: string;
};

export const BLOCK_CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: "layout", label: "Layout" },
  { id: "content", label: "Content" },
  { id: "marketing", label: "Marketing" },
  { id: "data", label: "Data" },
];

export const BLOCK_TYPES: BlockTypeMeta[] = blockRegistry.listMeta().map((m) => ({
  type: m.type,
  label: m.name,
  icon: m.icon,
  category: m.category,
  description: m.description,
  version: m.version,
}));

export function getBlockMeta(type: BlockType): BlockTypeMeta | undefined {
  const entry = blockRegistry.get(type);
  if (!entry) return undefined;
  return {
    type: entry.type,
    label: entry.name,
    icon: entry.icon,
    category: entry.category,
    description: entry.description,
    version: entry.version,
  };
}

export { blockRegistry };
