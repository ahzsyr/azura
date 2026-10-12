import "server-only";

import { createContentItemAdapter } from "@/features/entities/adapters/content-item.adapter";
import { createKnowledgeAdapter } from "@/features/entities/adapters/knowledge.adapter";
import { createPartnerAdapter } from "@/features/entities/adapters/partner.adapter";
import { createPricingAdapter } from "@/features/entities/adapters/pricing.adapter";
import { createProductAdapter } from "@/features/entities/adapters/product.adapter";
import { createTeamMemberAdapter } from "@/features/entities/adapters/team-member.adapter";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";
import { deleteEntityByPreset, saveEntityByPreset } from "@/features/entities/entity-write.service";
import { EntityPresetNotActiveError, UnknownEntityPresetError } from "@/features/entities/errors";
import { isPresetActive } from "@/config/deployment-profile/site-features";
import {
  getEntityTypeDefinition,
  isEntityPresetId,
  listEntityTypeDefinitions,
  resolvePresetByContentTypeSlug,
  resolvePresetByLegacySource,
} from "@/features/entities/preset-registry";
import type {
  Category,
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityPresetId,
  EntityRecord,
  EntitySaveResult,
  EntityTypeDefinition,
  EntityWriteInput,
} from "@/features/entities/types";

async function assertActivePreset(presetId: EntityPresetId): Promise<EntityTypeDefinition> {
  if (!(await isPresetActive(presetId))) {
    throw new EntityPresetNotActiveError(presetId);
  }
  const definition = getEntityTypeDefinition(presetId);
  if (!definition) {
    throw new UnknownEntityPresetError(presetId);
  }
  if (definition.status !== "active") {
    throw new EntityPresetNotActiveError(presetId);
  }
  return definition;
}

async function resolveAdapter(presetId: EntityPresetId): Promise<EntityStorageAdapter> {
  const definition = await assertActivePreset(presetId);

  if (
    definition.storage === "content_item" ||
    (definition.storage === "product" && definition.migrationPhase === "content_item")
  ) {
    const contentTypeSlug =
      definition.contentTypeSlug ??
      (presetId === "product" ? "products" : undefined);
    if (!contentTypeSlug) {
      throw new Error(`Content item preset missing contentTypeSlug: ${presetId}`);
    }
    return createContentItemAdapter(presetId, contentTypeSlug);
  }

  if (definition.storage === "product") {
    return createProductAdapter(presetId, definition.contentTypeSlug ?? "products");
  }

  if (definition.storage === "portal" && presetId === "knowledge") {
    return createKnowledgeAdapter();
  }

  if (definition.storage === "portal" && presetId === "team-member") {
    return createTeamMemberAdapter();
  }

  if (definition.storage === "portal" && presetId === "partner") {
    return createPartnerAdapter();
  }

  if (definition.storage === "portal" && presetId === "pricing") {
    return createPricingAdapter();
  }

  throw new EntityPresetNotActiveError(presetId);
}

export const entityService = {
  async listEntityTypes(options?: {
    includePlanned?: boolean;
    profileAware?: boolean;
  }): Promise<EntityTypeDefinition[]> {
    const defs = listEntityTypeDefinitions({ ...options, profileAware: false });
    if (options?.profileAware === false) return defs;
    const active: EntityTypeDefinition[] = [];
    for (const def of defs) {
      if (await isPresetActive(def.presetId)) active.push(def);
    }
    return active;
  },

  getEntityType(presetId: EntityPresetId): EntityTypeDefinition | null {
    if (!isEntityPresetId(presetId)) return null;
    return getEntityTypeDefinition(presetId);
  },

  resolvePresetByContentTypeSlug(slug: string): EntityPresetId | null {
    return resolvePresetByContentTypeSlug(slug);
  },

  resolvePresetByLegacySource(source: string): EntityPresetId | null {
    return resolvePresetByLegacySource(source);
  },

  async listEntities(
    presetId: EntityPresetId,
    options?: EntityListOptions,
  ): Promise<EntityListRow[]> {
    const adapter = await resolveAdapter(presetId);
    return adapter.list(options);
  },

  async getEntity(
    presetId: EntityPresetId,
    idOrSlug: string,
    options?: EntityGetOptions,
  ): Promise<EntityRecord | null> {
    const adapter = await resolveAdapter(presetId);
    return adapter.get(idOrSlug, options);
  },

  async listCollections(
    presetId: EntityPresetId,
    options?: EntityListOptions,
  ): Promise<Collection[]> {
    const adapter = await resolveAdapter(presetId);
    if (!adapter.listCollections) return [];
    return adapter.listCollections(options);
  },

  /** Canonical name for listCollections (Categories unification). */
  async listCategories(
    presetId: EntityPresetId,
    options?: EntityListOptions,
  ): Promise<Category[]> {
    const adapter = await resolveAdapter(presetId);
    if (adapter.listCategories) return adapter.listCategories(options);
    if (!adapter.listCollections) return [];
    return adapter.listCollections(options);
  },

  async saveEntity(input: EntityWriteInput): Promise<EntitySaveResult> {
    await assertActivePreset(input.presetId);
    return saveEntityByPreset(input);
  },

  async deleteEntity(presetId: EntityPresetId, idOrSlug: string): Promise<void> {
    await assertActivePreset(presetId);
    await deleteEntityByPreset(presetId, idOrSlug);
  },
};
