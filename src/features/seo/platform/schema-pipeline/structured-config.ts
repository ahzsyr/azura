import type { SeoStructuredConfig } from "@/features/seo/types";
import { SCHEMA_CONFIG_VERSION } from "@/features/seo/platform/schema-pipeline/constants";

/** Migrate and normalize JsonStore structured-data config on read. */
export function normalizeStructuredConfig(raw: SeoStructuredConfig | null | undefined): SeoStructuredConfig {
  const config: SeoStructuredConfig = { ...(raw ?? {}) };
  const incomingVersion = raw?.version ?? 0;

  // Legacy v3 opt-in FAQ should fall back to default-off; explicit v4+ opt-in is preserved.
  if (incomingVersion < 4 && config.builderFlags?.faqBuilder === true) {
    const flags = { ...config.builderFlags };
    delete flags.faqBuilder;
    config.builderFlags = flags;
  }

  if (!config.version || config.version < SCHEMA_CONFIG_VERSION) {
    config.version = SCHEMA_CONFIG_VERSION;
  }

  if (!config.typeRepresentation) {
    config.typeRepresentation = "most-specific";
  }

  return config;
}

export function prepareStructuredConfigForSave(
  input: SeoStructuredConfig,
): SeoStructuredConfig {
  return normalizeStructuredConfig({
    ...input,
    version: SCHEMA_CONFIG_VERSION,
    typeRepresentation: input.typeRepresentation ?? "most-specific",
    entityTypePinned: Boolean(input.entityTypePinned),
  });
}
