export const SEARCH_OPS_NAV = [
  {
    href: "/admin/seo/search-operations/overview",
    segment: "overview",
    tabLabel: "Overview",
    navLabel: "Search Operations",
    breadcrumbLabel: "Overview",
    keywords: ["search operations", "command center", "health", "actions", "approvals"],
    navItemId: "seo-search-operations",
  },
  {
    href: "/admin/seo/search-operations/operations",
    segment: "operations",
    tabLabel: "Queue",
    navLabel: "Operations Queue",
    breadcrumbLabel: "Queue",
    keywords: ["queue", "approvals", "running", "failed", "scheduled"],
    navItemId: "seo-so-operations",
  },
  {
    href: "/admin/seo/search-operations/pages",
    segment: "pages",
    tabLabel: "Pages",
    navLabel: "Pages",
    breadcrumbLabel: "Pages",
    keywords: ["url inspector", "serp", "indexing", "impact simulation"],
    navItemId: "seo-so-pages",
  },
  {
    href: "/admin/seo/search-operations/entities",
    segment: "entities",
    tabLabel: "Entities",
    navLabel: "Entities",
    breadcrumbLabel: "Entities",
    keywords: ["entity cms", "organization", "merge", "schema publish"],
    navItemId: "seo-so-entities",
  },
  {
    href: "/admin/seo/search-operations/content",
    segment: "content",
    tabLabel: "Content",
    navLabel: "Content",
    breadcrumbLabel: "Content",
    keywords: ["topics", "ai audit", "internal links", "drafts"],
    navItemId: "seo-so-content",
  },
  {
    href: "/admin/seo/search-operations/google",
    segment: "google",
    tabLabel: "Google",
    navLabel: "Google",
    breadcrumbLabel: "Google",
    keywords: ["search console", "business profile", "pagespeed", "indexing api"],
    navItemId: "seo-so-google",
  },
  {
    href: "/admin/seo/search-operations/monitoring",
    segment: "monitoring",
    tabLabel: "Monitoring",
    navLabel: "Monitoring",
    breadcrumbLabel: "Monitoring",
    keywords: ["incidents", "authority", "performance", "alerts"],
    navItemId: "seo-so-monitoring",
  },
  {
    href: "/admin/seo/search-operations/automation",
    segment: "automation",
    tabLabel: "Automation",
    navLabel: "Automation",
    breadcrumbLabel: "Automation",
    keywords: ["workflows", "rules", "triggers", "scheduled jobs"],
    navItemId: "seo-so-automation",
  },
  {
    href: "/admin/seo/search-operations/settings",
    segment: "settings",
    tabLabel: "Settings",
    navLabel: "Ops Settings",
    breadcrumbLabel: "Settings",
    keywords: ["approval policy", "risk", "promotion", "environments"],
    navItemId: "seo-so-settings",
  },
] as const;

export type SearchOpsNavItem = (typeof SEARCH_OPS_NAV)[number];

export function getSearchOpsNavBySegment(segment: string): SearchOpsNavItem | undefined {
  return SEARCH_OPS_NAV.find((item) => item.segment === segment);
}
