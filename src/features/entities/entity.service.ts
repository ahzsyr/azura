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
import { isPresetEnabled } from "@/config/deployment-profile";
import {
  getEntityTypeDefinition,
  isEntityPresetId,
  listEntityTypeDefinitions,
  resolvePresetByContentTypeSlug,
  resolvePresetByLegacySource,
} from "@/features/entities/preset-registry";
import type {
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

function assertActivePreset(presetId: EntityPresetId): EntityTypeDefinition {
  if (!isPresetEnabled(presetId)) {
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

function resolveAdapter(presetId: EntityPresetId): EntityStorageAdapter {
  const definition = assertActivePreset(presetId);

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
  listEntityTypes(options?: { includePlanned?: boolean; profileAware?: boolean }): EntityTypeDefinition[] {
    const defs = listEntityTypeDefinitions(options);
    if (options?.profileAware === false) return defs;
    return defs.filter((def) => isPresetEnabled(def.presetId));
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
    const adapter = resolveAdapter(presetId);
    return adapter.list(options);
  },

  async getEntity(
    presetId: EntityPresetId,
    idOrSlug: string,
    options?: EntityGetOptions,
  ): Promise<EntityRecord | null> {
    const adapter = resolveAdapter(presetId);
    return adapter.get(idOrSlug, options);
  },

  async listCollections(
    presetId: EntityPresetId,
    options?: EntityListOptions,
  ): Promise<Collection[]> {
    const adapter = resolveAdapter(presetId);
    if (!adapter.listCollections) return [];
    return adapter.listCollections(options);
  },

  async saveEntity(input: EntityWriteInput): Promise<EntitySaveResult> {
    assertActivePreset(input.presetId);
    return saveEntityByPreset(input);
  },

  async deleteEntity(presetId: EntityPresetId, idOrSlug: string): Promise<void> {
    assertActivePreset(presetId);
    await deleteEntityByPreset(presetId, idOrSlug);
  },
};
