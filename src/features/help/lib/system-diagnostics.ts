import { getDeploymentProfile } from "@/config/deployment-profile";
import { getProductVersion } from "@/config/site";
import { HELP_CONTENT_VERSION } from "@/features/help/data/version";
import type { HelpSystemDiagnostics } from "@/features/help/types";

export function getServerHelpDiagnostics(partial?: {
  enabledLanguages?: string[];
  defaultLanguage?: string | null;
  searchEngine?: string;
}): HelpSystemDiagnostics {
  const profile = getDeploymentProfile();
  return {
    applicationVersion: getProductVersion(),
    helpContentVersion: HELP_CONTENT_VERSION,
    deploymentProfileId: profile.profileId,
    deploymentProfileLabel: profile.label,
    environment: process.env.NODE_ENV ?? "unknown",
    enabledModules: [...profile.modules],
    enabledCapabilities: [...profile.capabilities, ...profile.core],
    enabledLanguages: partial?.enabledLanguages ?? [],
    defaultLanguage: partial?.defaultLanguage ?? null,
    currentTheme: null,
    currentTimezone: null,
    searchEngine: partial?.searchEngine ?? "Built-in",
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE ?? process.env.BUILD_DATE ?? null,
  };
}

export function withClientDiagnostics(
  diagnostics: HelpSystemDiagnostics,
  client: { theme?: string | null; timezone?: string | null }
): HelpSystemDiagnostics {
  return {
    ...diagnostics,
    currentTheme: client.theme ?? diagnostics.currentTheme,
    currentTimezone: client.timezone ?? diagnostics.currentTimezone,
  };
}
