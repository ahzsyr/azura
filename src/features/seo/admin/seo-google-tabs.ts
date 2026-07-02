export const SEO_GOOGLE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Google Analytics" },
  { id: "tag-manager", label: "Tag Manager" },
  { id: "search-console", label: "Search Console" },
] as const;

export type SeoGoogleTabId = (typeof SEO_GOOGLE_TABS)[number]["id"];

export function isValidGoogleTab(id: string | null): id is SeoGoogleTabId {
  return SEO_GOOGLE_TABS.some((tab) => tab.id === id);
}
