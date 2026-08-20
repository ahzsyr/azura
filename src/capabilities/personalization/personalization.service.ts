import { jsonStoreService } from "@/features/storage/json-store.service";
import { ALL_PRESETS } from "@/features/theme/presets-catalog";

const NAMESPACE = "personalization";
const SETTINGS_KEY = "settings";

/** Logical corners — mirror correctly in RTL/LTR via start/end CSS. */
export type PersonalizationPosition =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end";

/** @deprecated Legacy physical corners — migrated on read */
export type LegacyPersonalizationPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export type WidgetSections = {
  showAppearance: boolean;
  showStyle: boolean;
  showFabThemeToggle: boolean;
  showBackToTop: boolean;
};

export type PersonalizationSettings = {
  enabled: boolean;
  position: PersonalizationPosition;
  presets: Array<{ id: string; visibleToUsers: boolean }>;
  widgetSections: WidgetSections;
};

const DEFAULT_WIDGET_SECTIONS: WidgetSections = {
  showAppearance: true,
  showStyle: true,
  showFabThemeToggle: true,
  showBackToTop: true,
};

const DEFAULT_SETTINGS: PersonalizationSettings = {
  enabled: true,
  position: "bottom-end",
  presets: ALL_PRESETS.map((preset) => ({
    id: preset.id,
    visibleToUsers: ["travel", "luxury", "medical", "agency", "finance", "saas", "brt"].includes(
      preset.id,
    ),
  })),
  widgetSections: DEFAULT_WIDGET_SECTIONS,
};

function migrateLegacyPosition(value: unknown): PersonalizationPosition {
  if (value === "bottom-right") return "bottom-end";
  if (value === "bottom-left") return "bottom-start";
  if (value === "top-right") return "top-end";
  if (value === "top-left") return "top-start";
  if (
    value === "bottom-start" ||
    value === "bottom-end" ||
    value === "top-start" ||
    value === "top-end"
  ) {
    return value;
  }
  return DEFAULT_SETTINGS.position;
}

function normalizePosition(value: unknown): PersonalizationPosition {
  return migrateLegacyPosition(value);
}

function normalizeWidgetSections(raw: Partial<WidgetSections> | undefined): WidgetSections {
  if (!raw || typeof raw !== "object") return DEFAULT_WIDGET_SECTIONS;
  return {
    showAppearance: raw.showAppearance !== false,
    showStyle: raw.showStyle !== false,
    showFabThemeToggle: raw.showFabThemeToggle !== false,
    showBackToTop: raw.showBackToTop !== false,
  };
}

function normalizeSettings(raw: Partial<PersonalizationSettings> | null): PersonalizationSettings {
  if (!raw) return DEFAULT_SETTINGS;
  const knownIds = new Set<string>(ALL_PRESETS.map((p) => p.id));
  const presets =
    Array.isArray(raw.presets) && raw.presets.length > 0
      ? raw.presets
          .filter((p) => knownIds.has(p.id))
          .map((p) => ({ id: p.id, visibleToUsers: p.visibleToUsers !== false }))
      : DEFAULT_SETTINGS.presets;

  return {
    enabled: raw.enabled !== false,
    position: normalizePosition(raw.position),
    presets,
    widgetSections: normalizeWidgetSections(raw.widgetSections),
  };
}

export const personalizationService = {
  async get(): Promise<PersonalizationSettings> {
    const stored = await jsonStoreService.get<Partial<PersonalizationSettings>>(
      NAMESPACE,
      SETTINGS_KEY,
    );
    return normalizeSettings(stored);
  },

  async save(settings: PersonalizationSettings): Promise<PersonalizationSettings> {
    const normalized = normalizeSettings(settings);
    await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, normalized);
    return normalized;
  },
};
