import "server-only";

import type { EntityPresetId, EntitySaveResult, EntityWriteInput } from "@/features/entities/types";
import { getEntityTypeDefinition } from "@/features/entities/preset-registry";
import { saveProductEntity } from "@/features/entities/adapters/product-write.adapter";
import { upsertContentEntity } from "@/features/entities/adapters/content-item-write.adapter";

export async function saveContentPresetEntity(input: EntityWriteInput): Promise<EntitySaveResult> {
  const definition = getEntityTypeDefinition(input.presetId);
  if (!definition?.contentTypeSlug) {
    throw new Error(`Missing content type for preset: ${input.presetId}`);
  }
  return upsertContentEntity(definition.contentTypeSlug, input);
}

export async function saveEntityByPreset(input: EntityWriteInput): Promise<EntitySaveResult> {
  if (input.presetId === "product") {
    return saveProductEntity(input);
  }

  const definition = getEntityTypeDefinition(input.presetId);
  if (definition?.storage === "content_item" && definition.contentTypeSlug) {
    return saveContentPresetEntity(input);
  }

  throw new Error(`Write not supported for preset: ${input.presetId}`);
}

export async function deleteEntityByPreset(
  presetId: EntityPresetId,
  idOrSlug: string,
): Promise<void> {
  if (presetId === "product") {
    const { deleteProductEntity } = await import("@/features/entities/adapters/product-write.adapter");
    await deleteProductEntity(idOrSlug);
    return;
  }

  const definition = getEntityTypeDefinition(presetId);
  if (definition?.storage === "content_item") {
    const { deleteContentEntity } = await import("@/features/entities/adapters/content-item-write.adapter");
    await deleteContentEntity(definition.contentTypeSlug!, idOrSlug);
    return;
  }

  throw new Error(`Delete not supported for preset: ${presetId}`);
}
