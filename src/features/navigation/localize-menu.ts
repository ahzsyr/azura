import type { PublicLocale } from "@/i18n/locale-config";
import { resolveLocalizedRecord } from "@/features/translation/translation-resolver";

type MenuItemLike = {
  label: string;
  labels?: Record<string, string>;
  children?: MenuItemLike[];
};

export function localizeMenuItem<T extends MenuItemLike>(
  item: T,
  languageCode: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): T {
  const label =
    resolveLocalizedRecord(item.labels, languageCode, enabledLocales, defaultCode) || item.label;

  return {
    ...item,
    label,
    children: item.children?.map((child) =>
      localizeMenuItem(child, languageCode, enabledLocales, defaultCode)
    ),
  };
}

export function localizeMenuItems<T extends MenuItemLike>(
  items: T[],
  languageCode: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): T[] {
  return items.map((item) => localizeMenuItem(item, languageCode, enabledLocales, defaultCode));
}

/** Build labels record from legacy single label + translation rows */
export function buildLabelsRecord(
  legacyLabel: string,
  translations: Record<string, string>
): Record<string, string> {
  const record = { ...translations };
  if (legacyLabel && !record.en) {
    record.en = legacyLabel;
  }
  return record;
}
