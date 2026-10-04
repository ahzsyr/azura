import type { BlockDefinition, BlockDefinitionMeta } from "@/types/block-system";
import type { BlockType } from "@/types/builder";
import { BLOCK_DEFINITIONS } from "./definitions";
import {
  BLOCK_FIELDS_KEYS,
  BLOCK_VIEW_KEYS,
  hasBlockFieldsDispatch,
  hasBlockViewDispatch,
  resolveBlockFieldsComponent,
} from "./block-cms-dispatch";

export type BlockRegistryEntry = BlockDefinition & {
  /** JSON-schema compatible settings shape (Zod-derived at runtime via validate) */
  settingsSchemaKey: string;
  viewKey: string;
  fieldsKey: string;
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
      viewKey: BLOCK_VIEW_KEYS[definition.type] ?? `block.view.${definition.type}`,
      fieldsKey: BLOCK_FIELDS_KEYS[definition.type] ?? `block.fields.${definition.type}`,
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

  /** True when CMS view dispatch (extracted or legacy switch) covers this type. */
  hasViewDispatch(type: BlockType): boolean {
    return hasBlockViewDispatch(type);
  }

  /** True when CMS fields dispatch (registry component or legacy switch) covers this type. */
  hasFieldsDispatch(type: BlockType): boolean {
    return hasBlockFieldsDispatch(type);
  }

  resolveFieldsComponent(type: BlockType) {
    return resolveBlockFieldsComponent(type);
  }
}

export const blockRegistry = new BlockRegistrySystem();

/** @deprecated Use blockRegistry.listMeta() — kept for admin picker compatibility */
export { BLOCK_DEFINITIONS };
