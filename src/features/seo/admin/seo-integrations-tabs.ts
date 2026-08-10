export const SEO_INTEGRATIONS_TABS = [
  { id: "monitor", label: "Monitoring" },
  { id: "configure", label: "Configure" },
  { id: "queue", label: "Queue & jobs" },
] as const;

export const SEO_PROVIDER_TABS = [
  { id: "indexnow", label: "IndexNow" },
  { id: "bing", label: "Bing" },
] as const;

export type SeoIntegrationsTabId = (typeof SEO_INTEGRATIONS_TABS)[number]["id"];
export type SeoProviderTabId = (typeof SEO_PROVIDER_TABS)[number]["id"];

export function isValidIntegrationsTab(id: string | null): id is SeoIntegrationsTabId {
  return SEO_INTEGRATIONS_TABS.some((t) => t.id === id);
}

export function isValidProviderTab(id: string | null): id is SeoProviderTabId {
  return SEO_PROVIDER_TABS.some((t) => t.id === id);
}
