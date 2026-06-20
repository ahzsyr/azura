/**
 * Translation module — unified scalable i18n architecture.
 */
export * from "./types";
export * from "./entity-registry";
export * from "./translation.service";
export * from "./translation-resolver";
export * from "./actions";
export { LocalizedFields, parseLocalizedFormData } from "./components/localized-fields";
export { TranslationStatusBadge, CompletionBadge } from "./components/translation-status-badge";
export { TranslationsDashboard } from "./components/translations-dashboard";
export { UniversalTranslationEditor, LocaleCompletionTabs } from "./components/universal-translation-editor";
export { LocaleTabPanel } from "./components/locale-tab-panel";
export { TranslatableStringList } from "./components/translatable-string-list";
export * from "./ui-message-meta";
export * from "./ui-messages-utils";
export { useLocales } from "./hooks/use-locales";
export { useEntityTranslations } from "./hooks/use-entity-translations";
export { getCompletionTier, completionTierClass } from "./completion-utils";
export { useLocalizedContent, LocalizedContent } from "./hooks/use-localized-content";
export * from "./translation-bundle";
export * from "./translation-job.service";
export { LocalizedSlugEditor } from "./components/localized-slug-editor";
export { localizedSlugService } from "./localized-slug.service";
export { parseFormTranslations } from "./form-fields";
export { syncEntityTranslationsFromForm } from "./form-sync.server";
