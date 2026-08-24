import type { ContentFieldDefinition } from "@/features/content/types";
import type {
  CompareFieldMeta,
  ComparisonSettings,
  ContentTypeComparisonConfig,
} from "@/features/comparison/types";
import { parseComparisonConfig } from "@/features/comparison/parse-comparison-config";

export function isContentTypeComparable(
  adminConfig: Record<string, unknown> | null | undefined
): boolean {
  const raw = adminConfig ?? {};
  if (raw.isComparable === false) return false;
  const config = parseComparisonConfig(raw);
  return config.comparisonSettings.enabled;
}

export function resolveCompareFields(
  fieldSchema: ContentFieldDefinition[],
  comparison: ContentTypeComparisonConfig
): CompareFieldMeta[] {
  const overrides = new Map(
    (comparison.comparisonSettings.attributes ?? []).map((a) => [a.key, a])
  );

  const candidates = fieldSchema
    .filter((f) => f.compare === true)
    .map((field, index) => {
      const override = overrides.get(field.key);
      return {
        key: field.key,
        field,
        labelEn: override?.labelEn ?? field.compareLabelEn ?? field.labelEn,
        labelAr: override?.labelAr ?? field.compareLabelAr ?? field.labelAr,
        compareOrder: override?.compareOrder ?? field.compareOrder ?? index * 10,
        compareGroup: override?.compareGroup ?? field.compareGroup ?? field.group ?? "General",
        highlightDifferences:
          override?.highlightDifferences ?? field.highlightDifferences ?? true,
      } satisfies CompareFieldMeta;
    });

  return candidates.sort((a, b) => a.compareOrder - b.compareOrder);
}

export function resolveComparisonForType(input: {
  fieldSchema: ContentFieldDefinition[];
  adminConfig: Record<string, unknown>;
}): {
  config: ContentTypeComparisonConfig;
  fields: CompareFieldMeta[];
  comparable: boolean;
} {
  const config = parseComparisonConfig(input.adminConfig);
  const fields = resolveCompareFields(input.fieldSchema, config);
  const hasCompareFields = fields.length > 0;
  const explicitlyDisabled = input.adminConfig.isComparable === false;
  const comparable =
    config.comparisonSettings.enabled && hasCompareFields && !explicitlyDisabled;
  return { config, fields, comparable };
}

export function getMaxCompareItems(settings: ComparisonSettings): number {
  return Math.min(Math.max(settings.maxItems, 2), 12);
}
