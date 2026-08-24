import { googleIntegrationRegistry } from "@/features/seo/google-platform/registry";

const registryTabs = googleIntegrationRegistry.tabs();

export const SEO_GOOGLE_TABS = registryTabs.map((tab) => ({
  id: tab.id,
  label: tab.label,
})) as Array<{ id: string; label: string }>;

export type SeoGoogleTabId = string;

export function isValidGoogleTab(id: string | null): id is SeoGoogleTabId {
  if (!id) return false;
  return SEO_GOOGLE_TABS.some((tab) => tab.id === id);
}

export function googleTabToIntegrationId(tabId: string) {
  return googleIntegrationRegistry.byTabId(tabId)?.id;
}
