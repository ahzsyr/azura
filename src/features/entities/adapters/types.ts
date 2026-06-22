import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityRecord,
} from "@/features/entities/types";

export interface EntityStorageAdapter {
  list(options?: EntityListOptions): Promise<EntityListRow[]>;
  get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null>;
  listCollections?(options?: EntityListOptions): Promise<Collection[]>;
}
