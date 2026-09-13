import { localeService } from "@/features/i18n/locale.service";
import { TranslationsDashboard } from "@/features/translation/components/translations-dashboard";
import { translationAiConfigService } from "@/features/translation/translation-ai-config.service";
import { TRANSLATION_AI_PROVIDER_META } from "@/capabilities/ai/providers/provider-meta";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FALLBACK_AI_CONFIG = {
  provider: "openai" as const,
  providerLabel: "OpenAI",
  hasApiKey: false,
  requiresApiKey: true,
  requiresModel: true,
  requiresBaseUrl: false,
  allowBaseUrlOverride: true,
  apiKeyOptional: false,
  defaultModel: "gpt-4o-mini",
  hint: "Highest quality — no permanent free tier",
  isConfigured: false,
  providers: TRANSLATION_AI_PROVIDER_META,
};

export default async function AdminTranslationsPage() {
  try {
    const [locales, aiConfig] = await Promise.all([
      localeService.listAll(),
      translationAiConfigService.getPublic().catch(() => FALLBACK_AI_CONFIG),
    ]);
    return (
      <TranslationsDashboard
        aiConfig={aiConfig}
        locales={locales.map((row) => ({
          id: row.id,
          code: row.code,
          urlPrefix: row.urlPrefix,
          label: row.label,
          flag: row.flag,
          isEnabled: row.isEnabled,
          isDefault: row.isDefault,
        }))}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin/translations] Server Components render failed:", message, error);
    throw error;
  }
}
