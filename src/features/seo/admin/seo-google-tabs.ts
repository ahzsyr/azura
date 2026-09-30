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

/** Platform section ids → short ribbon labels. */
export const GOOGLE_SECTION_LABELS: Record<string, string> = {
  connection: "Connection",
  configuration: "Configuration",
  operational_policy: "Policy",
  validation: "Validation",
  operations: "Operations",
  monitoring: "Monitoring",
  permissions: "Permissions",
  history: "History",
  feed: "Feed",
  legacy: "Details",
  property: "Property",
  tracking: "Tracking",
  tags: "Tags",
};

export type GoogleSectionTab = { id: string; label: string };

export function labelForGoogleSection(sectionId: string): string {
  return GOOGLE_SECTION_LABELS[sectionId] ?? sectionId.replace(/_/g, " ");
}

export function googleSectionTabs(sectionIds: string[]): GoogleSectionTab[] {
  return sectionIds.map((id) => ({ id, label: labelForGoogleSection(id) }));
}

/** Resolve active section from URL, optional hash hint, and available sections. */
export function resolveGoogleSection(
  available: string[],
  sectionParam: string | null,
  hashHint?: string | null,
): string {
  if (available.length === 0) return "";
  if (sectionParam && available.includes(sectionParam)) return sectionParam;
  if (hashHint && available.includes(hashHint)) return hashHint;
  return available[0];
}

/**
 * Sub-nav / ribbon section ids for a primary Google tab (mirrors integration page extras).
 */
export function googleSubNavForPrimaryTab(
  tabId: string,
  platformSections: string[] | undefined,
): GoogleSectionTab[] {
  if (tabId === "overview" || tabId === "settings") return [];

  if (tabId === "merchant-center") {
    const filtered = (platformSections ?? []).filter(
      (s) => s !== "operations" && s !== "operational_policy",
    );
    return [{ id: "feed", label: "Feed" }, ...googleSectionTabs(filtered)];
  }

  const base = googleSectionTabs(platformSections ?? []);
  if (tabId === "analytics") return [...base, { id: "tracking", label: "Tracking" }];
  if (tabId === "tag-manager") return [...base, { id: "tags", label: "Tags" }];
  if (tabId === "search-console") return [...base, { id: "property", label: "Property" }];
  return base;
}
