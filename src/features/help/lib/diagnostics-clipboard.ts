import type { HelpSystemDiagnostics } from "@/features/help/types";

export function formatDiagnosticsClipboard(diagnostics: HelpSystemDiagnostics): string {
  return [
    "AZURA Admin Help — System Diagnostics",
    `Application Version: ${diagnostics.applicationVersion}`,
    `Help Content Version: ${diagnostics.helpContentVersion}`,
    `Deployment Profile: ${diagnostics.deploymentProfileLabel} (${diagnostics.deploymentProfileId})`,
    `Environment: ${diagnostics.environment}`,
    `Enabled Modules: ${diagnostics.enabledModules.join(", ") || "—"}`,
    `Enabled Capabilities: ${diagnostics.enabledCapabilities.join(", ") || "—"}`,
    `Enabled Languages: ${diagnostics.enabledLanguages.join(", ") || "—"}`,
    `Default Language: ${diagnostics.defaultLanguage ?? "—"}`,
    `Current Theme: ${diagnostics.currentTheme ?? "—"}`,
    `Current Timezone: ${diagnostics.currentTimezone ?? "—"}`,
    `Search Engine: ${diagnostics.searchEngine}`,
    `Build Date: ${diagnostics.buildDate ?? "—"}`,
  ].join("\n");
}
