import type { BlockDefinition, BlockDefinitionMeta } from "@/types/block-system";
import type { BlockType } from "@/types/builder";
import { BLOCK_DEFINITION_MAP, BLOCK_DEFINITIONS } from "./definitions";

export type BlockRegistryEntry = BlockDefinition & {
  /** JSON-schema compatible settings shape (Zod-derived at runtime via validate) */
  settingsSchemaKey: string;
};

class BlockRegistrySystem {
  private readonly entries = new Map<BlockType, BlockRegistryEntry>();

  constructor() {
    for (const def of BLOCK_DEFINITIONS) {
      this.register(def);
    }
  }

  register(definition: BlockDefinition): BlockRegistryEntry {
    const entry: BlockRegistryEntry = {
      ...definition,
      settingsSchemaKey: `block.${definition.type}.settings`,
    };
    this.entries.set(definition.type, entry);
    return entry;
  }

  get(type: BlockType): BlockRegistryEntry | undefined {
    return this.entries.get(type);
  }

  getOrThrow(type: BlockType): BlockRegistryEntry {
    const entry = this.get(type);
    if (!entry) throw new Error(`Unknown block type: ${type}`);
    return entry;
  }

  list(): BlockRegistryEntry[] {
    return [...this.entries.values()];
  }

  listMeta(): BlockDefinitionMeta[] {
    return this.list().map(({ type, version, category, name, description, icon }) => ({
      type,
      version,
      category,
      name,
      description,
      icon,
    }));
  }

  byCategory(category: BlockDefinition["category"]): BlockRegistryEntry[] {
    return this.list().filter((e) => e.category === category);
  }

  has(type: string): type is BlockType {
    return this.entries.has(type as BlockType);
  }
}

export const blockRegistry = new BlockRegistrySystem();

/** @deprecated Use blockRegistry.listMeta() — kept for admin picker compatibility */
export { BLOCK_DEFINITIONS };
