import { localeService } from "@/features/i18n/locale.service";
import { TranslationsDashboard } from "@/features/translation/components/translations-dashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEBUG_SESSION_ID = "5e2427";

function debugLog(
  step: string,
  hypothesisId: string,
  data: Record<string, unknown>,
  runId = "post-fix"
) {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    runId,
    hypothesisId,
    location: "admin/translations/page.tsx",
    message: step,
    data,
    timestamp: Date.now(),
  };
  console.error(`[debug-${DEBUG_SESSION_ID}]`, JSON.stringify(payload));
}

export default async function AdminTranslationsPage() {
  const pageStartedAt = Date.now();
  const locales = await localeService.listAll();
  debugLog("page_shell_ok", "H6", {
    localeCount: locales.length,
    ms: Date.now() - pageStartedAt,
  });

  return <TranslationsDashboard locales={locales} />;
}
