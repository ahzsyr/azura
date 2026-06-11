/**
 * Translation module — unified scalable i18n architecture.
 */
export * from "./types";
export * from "./entity-registry";
export * from "./translation.service";
export * from "./translation-resolver";
export * from "./hybrid-sync";
export * from "./ui-message.service";
export * from "./actions";
export { LocalizedFields, parseLocalizedFormData } from "./components/localized-fields";
export { TranslationStatusBadge, CompletionBadge } from "./components/translation-status-badge";
export { TranslationsDashboard } from "./components/translations-dashboard";
export { UniversalTranslationEditor, LocaleCompletionTabs } from "./components/universal-translation-editor";
export { LocaleTabPanel } from "./components/locale-tab-panel";
export { TranslatableStringList } from "./components/translatable-string-list";
export { UiMessagesAdmin } from "./components/ui-messages-admin";
export * from "./ui-message-meta";
export * from "./ui-messages-utils";
export { useLocales } from "./hooks/use-locales";
export { useEntityTranslations } from "./hooks/use-entity-translations";
export { getCompletionTier, completionTierClass } from "./completion-utils";
export { useLocalizedContent, LocalizedContent } from "./hooks/use-localized-content";
export * from "./legacy-adapter";
export * from "./i18n-flags";
export * from "./translation-bundle";
export * from "./translation-job.service";
export { LocalizedSlugEditor } from "./components/localized-slug-editor";
export { parseFormTranslations, syncEntityTranslationsFromForm, extractLegacyColumns } from "./form-sync";
