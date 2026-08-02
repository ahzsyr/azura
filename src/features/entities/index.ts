export type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityPresetId,
  EntityRecord,
  EntityRef,
  EntityRoutePolicy,
  EntityPresetStatus,
  EntitySaveResult,
  EntityStorageBackend,
  EntityTypeDefinition,
  EntityWriteInput,
} from "@/features/entities/types";

export {
  EntityPresetNotActiveError,
  UnknownEntityPresetError,
} from "@/features/entities/errors";

export {
  ENTITY_TYPE_DEFINITIONS,
  getEntityTypeDefinition,
  isEntityPresetId,
  listEntityTypeDefinitions,
  resolveLegacySourceByPreset,
  resolvePresetByContentTypeSlug,
  resolvePresetByLegacySource,
} from "@/features/entities/preset-registry";

export { entityService } from "@/features/entities/entity.service";
export {
  isEntityDualWriteEnabled,
  isEntityReadContentEnabled,
  isEntityWritePrimaryEnabled,
  isProductTableReadOnly,
} from "@/features/entities/entity-flags";
export { PRODUCT_CONTENT_TYPE_SLUG } from "@/features/entities/migration/metadata";
export { verifyProductEntityParity } from "@/features/entities/pilot/product-entity-parity";
