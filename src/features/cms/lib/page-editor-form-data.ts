import type { ContentStatus } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import type { Composition, PageBlocks } from "@/types/builder";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { EntityTranslationInput } from "@/features/translation/types";

export type PageEditorLocaleFields = Record<string, Record<string, string>>;

export type PageEditorFormState = {
  slug: string;
  status: ContentStatus;
  templateKey: string;
  scheduledAt: string;
  revisionMessage: string;
  composition: Composition;
  localeFields: PageEditorLocaleFields;
  visualSettings: PageVisualSettings;
};

export type PageEditorSubmitMeta = {
  pageId?: string;
  editorTab: string;
  selectedBlockId: string | null;
  editorInspector: string;
  editorRegion?: string;
  statusOverride?: ContentStatus;
};

export function getPageEditorLocalizedInputName(fieldKey: string, localeCode: string): string {
  const suffix = getContentFieldSuffix(localeCode);
  if (suffix === "En" || suffix === "Ar") {
    return `${fieldKey}${suffix}`;
  }
  return `${fieldKey}_${localeCode}`;
}

export function buildPageEditorFormData(
  state: PageEditorFormState,
  meta: PageEditorSubmitMeta,
  options: {
    locales?: PublicLocale[];
    blocks?: PageBlocks;
    composition?: Composition;
    blockTranslations?: EntityTranslationInput[] | null;
  } = {},
): FormData {
  const formData = new FormData();
  const composition = options.composition ?? state.composition;
  const blocks = options.blocks ?? composition.regions.primary;
  const status = meta.statusOverride ?? state.status;

  if (meta.pageId) formData.set("id", meta.pageId);
  formData.set("slug", state.slug);
  formData.set("status", status);
  formData.set("scheduledAt", state.scheduledAt);
  formData.set("composition", JSON.stringify(composition));
  formData.set("blocks", JSON.stringify(blocks));
  formData.set("visualSettings", JSON.stringify(state.visualSettings));
  formData.set("editorTab", meta.editorTab);
  formData.set("selectedBlockId", meta.selectedBlockId ?? "");
  formData.set("editorInspector", meta.editorInspector);
  if (meta.editorRegion) {
    formData.set("editorRegion", meta.editorRegion);
  }
  if (state.revisionMessage) {
    formData.set("revisionMessage", state.revisionMessage);
  }

  const locales = options.locales ?? [];
  if (locales.length > 0) {
    for (const fieldKey of ["title", "excerpt"] as const) {
      for (const locale of locales) {
        const name = getPageEditorLocalizedInputName(fieldKey, locale.code);
        const value = state.localeFields[fieldKey]?.[locale.code] ?? "";
        formData.set(name, value);
      }
    }
  } else {
    for (const fieldKey of ["title", "excerpt"] as const) {
      for (const locale of locales) {
        const name = getPageEditorLocalizedInputName(fieldKey, locale.code);
        const value = state.localeFields[fieldKey]?.[locale.code] ?? "";
        formData.set(name, value);
      }
    }
  }

  const translations = options.blockTranslations;
  if (translations != null && translations.length > 0) {
    formData.set("blockTranslations", JSON.stringify(translations));
  } else if (translations != null) {
    formData.set("blockTranslations", JSON.stringify([]));
  }

  return formData;
}
