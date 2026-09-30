import { assertAdminRouteEnabled } from "@/config/deployment-profile";
import { HelpCenterClient } from "@/features/help/components/help-center-client";
import { getServerHelpDiagnostics } from "@/features/help/lib/system-diagnostics";
import { localeService } from "@/features/i18n/locale.service";

export const dynamic = "force-dynamic";

export default async function AdminHelpPage() {
  assertAdminRouteEnabled("/admin/help");

  let enabledLanguages: string[] = [];
  let defaultLanguage: string | null = null;
  try {
    const locales = await localeService.listAll();
    enabledLanguages = locales.filter((l) => l.isEnabled).map((l) => l.code);
    defaultLanguage = locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? null;
  } catch {
    // Locales may be unavailable during early setup — diagnostics still render.
  }

  const diagnostics = getServerHelpDiagnostics({
    enabledLanguages,
    defaultLanguage,
    searchEngine: "Built-in",
  });

  return <HelpCenterClient diagnostics={diagnostics} />;
}
