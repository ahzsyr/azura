export const SEO_SETTINGS_TABS = [
  { id: "robots", label: "Robots.txt" },
  { id: "structured", label: "Structured data" },
  { id: "redirects", label: "Redirects" },
  { id: "integrations", label: "Integrations" },
] as const;

export type SeoSettingsTabId = (typeof SEO_SETTINGS_TABS)[number]["id"];

export function isValidSeoSettingsTab(id: string | null): id is SeoSettingsTabId {
  return SEO_SETTINGS_TABS.some((t) => t.id === id);
}
