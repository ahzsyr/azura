import {
  comparisonSettingsSchema,
  contentTypeComparisonConfigSchema,
} from "@/schemas/comparison/comparison-config";
import type { ContentTypeComparisonConfig } from "@/features/comparison/types";

const DEFAULT_SETTINGS: ContentTypeComparisonConfig["comparisonSettings"] = {
  enabled: true,
  maxItems: 4,
  comparisonMode: "hybrid",
};

export function parseComparisonConfig(
  adminConfig: Record<string, unknown> | null | undefined
): ContentTypeComparisonConfig {
  const raw = adminConfig ?? {};
  const isComparable = raw.isComparable === true;
  const comparisonGroup =
    typeof raw.comparisonGroup === "string" ? raw.comparisonGroup : undefined;
  const comparisonPriority =
    typeof raw.comparisonPriority === "number" ? raw.comparisonPriority : undefined;
  const settingsRaw =
    raw.comparisonSettings && typeof raw.comparisonSettings === "object"
      ? raw.comparisonSettings
      : {};

  let comparisonSettings = DEFAULT_SETTINGS;
  try {
    const parsed = comparisonSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      ...settingsRaw,
    });
    comparisonSettings = parsed;
  } catch {
    comparisonSettings = DEFAULT_SETTINGS;
  }

  try {
    return contentTypeComparisonConfigSchema.parse({
      isComparable,
      comparisonGroup,
      comparisonPriority,
      comparisonSettings,
    });
  } catch {
    return {
      isComparable,
      comparisonGroup,
      comparisonPriority,
      comparisonSettings: DEFAULT_SETTINGS,
    };
  }
}

export function mergeComparisonIntoAdminConfig(
  adminConfig: Record<string, unknown>,
  comparison: ContentTypeComparisonConfig
): Record<string, unknown> {
  return {
    ...adminConfig,
    isComparable: comparison.isComparable,
    comparisonGroup: comparison.comparisonGroup,
    comparisonPriority: comparison.comparisonPriority,
    comparisonSettings: comparison.comparisonSettings,
  };
}
