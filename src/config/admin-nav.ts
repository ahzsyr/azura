import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  FileText,
  Newspaper,
  Image,
  HelpCircle,
  Star,
  Hotel,
  Briefcase,
  MessageSquare,
  MonitorPlay,
  PanelTop,
  PanelBottom,
  Palette,
  Wand2,
  Loader2,
  Megaphone,
  Search,
  LineChart,
  Route,
  Bot,
  Braces,
  AlertCircle,
  Languages,
  Building2,
  Database,
  Layers,
  Tags,
  FormInput,
  MailPlus,
  Inbox,
  DollarSign,
  Calculator,
  BookOpen,
  Activity,
  Users,
  Handshake,
  Rocket,
  UserCog,
  EyeOff,
  LayoutPanelTop,
  Sparkles,
  History,
  ListChecks,
  Mail,
  Map,
  Share2,
  Send,
  Link2,
  Zap,
  Target,
} from "lucide-react";

import {
  isAdminHrefEnabled,
  isAdminNavItemEnabled,
} from "@/config/deployment-profile";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  /** Maps 1:1 to docs/admin-nav-manifest.yaml item id when present. */
  navItemId?: string;
};

export type AdminNavSection = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
  /** Optional nested sections inside a top-level group (e.g. CONTENT). */
  sections?: AdminNavSection[];
};

export const ADMIN_DASHBOARD: AdminNavItem = {
  href: "/admin",
  label: "Dashboard",
  icon: LayoutDashboard,
  keywords: ["home", "overview"],
  navItemId: "dashboard",
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "content",
    label: "Content",
    items: [],
    sections: [
      {
        id: "overview",
        label: "Overview",
        items: [
          {
            href: "/admin/content",
            label: "Content",
            icon: Layers,
            keywords: ["content hub", "types", "catalog", "overview"],
            navItemId: "content-types",
          },
        ],
      },
      {
        id: "core",
        label: "Core pages",
        items: [
          { href: "/admin/pages", label: "Pages", icon: FileText, keywords: ["cms", "content"], navItemId: "pages" },
          { href: "/admin/posts", label: "Blog", icon: Newspaper, keywords: ["posts", "articles"], navItemId: "blog" },
        ],
      },
      {
        id: "catalog",
        label: "Catalog",
        items: [
          {
            href: "/admin/products",
            label: "Products",
            icon: Package,
            keywords: ["products", "sku", "catalog"],
            navItemId: "products",
          },
          {
            href: "/admin/content/offerings",
            label: "Services",
            icon: Briefcase,
            keywords: ["services", "content items", "offerings"],
            navItemId: "services",
          },
          {
            href: "/admin/content/catalog-items",
            label: "Packages",
            icon: Package,
            keywords: ["packages", "destinations", "tours"],
            navItemId: "packages",
          },
          {
            href: "/admin/content/listings",
            label: "Properties",
            icon: Hotel,
            keywords: ["hotels", "properties", "entities", "listings"],
            navItemId: "properties",
          },
          {
            href: "/admin/collections",
            label: "Collections",
            icon: Layers,
            keywords: ["collections", "rules"],
            navItemId: "collections",
          },
          {
            href: "/admin/catalog-taxonomy",
            label: "Brands & Tags",
            icon: Tags,
            keywords: ["brands", "tags", "taxonomy", "catalog"],
            navItemId: "brands-tags",
          },
        ],
      },
      {
        id: "organization",
        label: "Organization",
        items: [
          { href: "/admin/team", label: "Team", icon: Users, keywords: ["directory", "staff"], navItemId: "team" },
          { href: "/admin/partners", label: "Partners", icon: Handshake, keywords: ["partners", "program"], navItemId: "partners" },
          { href: "/admin/knowledge-base", label: "Knowledge Base", icon: BookOpen, keywords: ["kb", "articles", "help"], navItemId: "knowledge-base" },
          { href: "/admin/pricing-plans", label: "Pricing Plans", icon: DollarSign, keywords: ["pricing", "plans"], navItemId: "pricing-plans" },
          { href: "/admin/releases", label: "Releases", icon: Rocket, keywords: ["changelog", "versions"], navItemId: "releases" },
        ],
      },
      {
        id: "assets",
        label: "Site content",
        items: [
          { href: "/admin/faqs", label: "FAQs", icon: HelpCircle, keywords: ["questions"], navItemId: "faqs" },
          { href: "/admin/testimonials", label: "Testimonials", icon: Star, keywords: ["reviews"], navItemId: "testimonials" },
          { href: "/admin/gallery", label: "Gallery", icon: Image, keywords: ["photos", "images"], navItemId: "gallery" },
          {
            href: "/admin/pricing-calculators",
            label: "Calculators",
            icon: Calculator,
            keywords: ["calculator", "pricing"],
            navItemId: "pricing-calculators",
          },
        ],
      },
    ],
  },
  {
    id: "media",
    label: "Media",
    items: [
      { href: "/admin/media", label: "Library", icon: Image, keywords: ["files", "uploads"], navItemId: "media-library" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { href: "/admin/marketing", label: "Marketing Hub", icon: Megaphone, keywords: ["marketing", "social", "integrations", "hub"], navItemId: "marketing-dashboard" },
      { href: "/admin/marketing/platforms", label: "Social Platforms", icon: Share2, keywords: ["meta", "facebook", "instagram", "linkedin", "oauth"], navItemId: "marketing-platforms" },
      { href: "/admin/marketing/publishing", label: "Publishing", icon: Send, keywords: ["publish", "schedule", "queue", "posts"], navItemId: "marketing-publishing" },
      { href: "/admin/marketing/analytics", label: "Social Analytics", icon: LineChart, keywords: ["reach", "impressions", "engagement"], navItemId: "marketing-analytics" },
      { href: "/admin/marketing/campaigns", label: "Campaigns", icon: Target, keywords: ["campaigns", "ads"], navItemId: "marketing-campaigns" },
      { href: "/admin/marketing/tracking", label: "Tracking", icon: Link2, keywords: ["pixel", "capi", "gtm", "events"], navItemId: "marketing-tracking" },
      { href: "/admin/marketing/automation", label: "Automation", icon: Zap, keywords: ["automation", "auto publish", "hooks"], navItemId: "marketing-automation" },
      { href: "/admin/marketing/leads", label: "Social Leads", icon: Inbox, keywords: ["lead forms", "meta leads"], navItemId: "marketing-leads" },
      { href: "/admin/forms", label: "Form Templates", icon: FormInput, keywords: ["forms", "builder", "lead", "contact"], navItemId: "form-templates" },
      { href: "/admin/surveys", label: "Surveys", icon: Star, keywords: ["surveys", "nps", "csat", "feedback"], navItemId: "surveys" },
      { href: "/admin/forms/analytics", label: "Forms Analytics", icon: LineChart, keywords: ["analytics", "forms", "submissions", "behavior"], navItemId: "forms-analytics" },
      { href: "/admin/form-submissions", label: "Form Submissions", icon: Inbox, keywords: ["submissions", "leads", "inbox"], navItemId: "form-submissions" },
      { href: "/admin/communications", label: "Communications", icon: Inbox, keywords: ["communications", "interactions", "inbox", "forms"], navItemId: "communications" },
      { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, keywords: ["leads", "contacts"], navItemId: "inquiries" },
      { href: "/admin/newsletter", label: "Newsletter", icon: MailPlus, keywords: ["email", "subscribers", "signup"], navItemId: "newsletter" },
    ],
  },
  {
    id: "modules",
    label: "Modules",
    items: [
      { href: "/admin/documentation", label: "Documentation", icon: FileText, keywords: ["docs", "portal"], navItemId: "documentation" },
      { href: "/admin/status", label: "Status", icon: Activity, keywords: ["uptime", "incidents"], navItemId: "status-page" },
    ],
  },
  {
    id: "design",
    label: "Design & Builder",
    items: [
      { href: "/admin/studio", label: "Studio", icon: MonitorPlay, keywords: ["preview", "editor"], navItemId: "studio" },
      { href: "/admin/header", label: "Header Builder", icon: PanelTop, keywords: ["navigation", "menu"], navItemId: "header" },
      { href: "/admin/footer", label: "Footer Builder", icon: PanelBottom, keywords: ["footer", "navigation"], navItemId: "footer" },
      {
        href: "/admin/theme",
        label: "Theme Studio",
        icon: Palette,
        keywords: ["theme", "colors", "branding", "presets", "typography", "motion", "effects"],
        navItemId: "theme",
      },
      { href: "/admin/personalization", label: "Personalization", icon: Wand2, keywords: ["customize"], navItemId: "personalization" },
      {
        href: "/admin/preloader",
        label: "Preloader",
        icon: Loader2,
        keywords: ["loading", "splash", "spinner", "preload"],
        navItemId: "preloader",
      },
      {
        href: "/admin/announcement-bar",
        label: "Announcement Bar",
        icon: Megaphone,
        keywords: ["announcement", "marquee", "strip", "banner", "ticker"],
        navItemId: "announcement-bar",
      },
      {
        href: "/admin/popups",
        label: "Popup Management",
        icon: LayoutPanelTop,
        keywords: ["popup", "modal", "floating", "slide-in", "promo", "cta", "overlay"],
        navItemId: "popups",
      },
      {
        href: "/admin/settings/whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
        keywords: ["whatsapp", "fab", "chat", "inquiry", "button"],
        navItemId: "whatsapp",
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    items: [],
    sections: [
      {
        id: "workspace",
        label: "Workspace",
        items: [
          {
            href: "/admin/seo",
            label: "Overview",
            icon: LayoutDashboard,
            keywords: ["seo", "health", "audit", "workspace", "overview"],
            navItemId: "seo-overview",
          },
          {
            href: "/admin/seo/metadata",
            label: "Metadata",
            icon: Tags,
            keywords: [
              "metadata",
              "meta",
              "open graph",
              "twitter",
              "json-ld",
              "robots",
              "dashboard",
              "static pages",
            ],
            navItemId: "seo-metadata",
          },
          {
            href: "/admin/seo/content",
            label: "Content Audit",
            icon: FileText,
            keywords: ["content", "structure", "snapshot", "analysis"],
            navItemId: "seo-content-audit",
          },
          {
            href: "/admin/seo/technical",
            label: "Technical Audit",
            icon: Search,
            keywords: ["technical", "crawl", "canonical", "schema"],
            navItemId: "seo-technical-audit",
          },
          {
            href: "/admin/seo/issues",
            label: "Issues",
            icon: AlertCircle,
            keywords: ["issues", "severity", "warnings"],
            navItemId: "seo-issues",
          },
          {
            href: "/admin/seo/recommendations",
            label: "Recommendations",
            icon: Sparkles,
            keywords: ["recommendations", "improvements", "suggestions"],
            navItemId: "seo-recommendations",
          },
          {
            href: "/admin/seo/history",
            label: "Audit History",
            icon: History,
            keywords: ["history", "snapshots", "trends"],
            navItemId: "seo-audit-history",
          },
        ],
      },
      {
        id: "operations",
        label: "Operations",
        items: [
          {
            href: "/admin/seo/redirects",
            label: "Redirects",
            icon: Route,
            keywords: ["urls", "301", "302"],
            navItemId: "seo-redirects",
          },
          {
            href: "/admin/seo/robots",
            label: "Robots",
            icon: Bot,
            keywords: ["crawl", "robots", "disallow"],
            navItemId: "seo-robots",
          },
          {
            href: "/admin/seo/sitemap",
            label: "Sitemap",
            icon: Map,
            keywords: ["sitemap", "xml", "urls", "crawl"],
            navItemId: "seo-sitemap",
          },
          {
            href: "/admin/seo/structured-data",
            label: "Structured Data",
            icon: Braces,
            keywords: ["schema", "json-ld"],
            navItemId: "seo-structured-data",
          },
          {
            href: "/admin/seo/google",
            label: "Google",
            icon: LineChart,
            keywords: [
              "google analytics",
              "gtag",
              "gtm",
              "tag manager",
              "ga4",
              "tracking",
              "search console",
              "gsc",
            ],
            navItemId: "seo-google",
          },
          {
            href: "/admin/seo/integrations",
            label: "Search Engines",
            icon: Activity,
            keywords: ["bing", "indexnow", "queue", "monitoring", "search engines"],
            navItemId: "seo-integrations",
          },
          {
            href: "/admin/seo/404",
            label: "404 Pages",
            icon: AlertCircle,
            keywords: ["not found", "404"],
            navItemId: "seo-404",
          },
        ],
      },
      {
        id: "configuration",
        label: "Configuration",
        items: [
          {
            href: "/admin/seo/rules",
            label: "Rules",
            icon: ListChecks,
            keywords: ["rules", "governance", "compliance"],
            navItemId: "seo-rules",
          },
          {
            href: "/admin/seo/schemas",
            label: "Schemas",
            icon: Braces,
            keywords: ["schemas", "registry", "json-ld"],
            navItemId: "seo-schemas",
          },
          {
            href: "/admin/seo/templates",
            label: "Templates",
            icon: FileText,
            keywords: ["templates", "patterns"],
            navItemId: "seo-templates",
          },
        ],
      },
      {
        id: "search-operations",
        label: "Search Operations",
        items: [
          {
            href: "/admin/seo/search-operations/overview",
            label: "Overview",
            icon: Sparkles,
            keywords: [
              "search operations",
              "command center",
              "health",
              "actions",
              "approvals",
            ],
            navItemId: "seo-search-operations",
          },
          {
            href: "/admin/seo/search-operations/operations",
            label: "Operations",
            icon: ListChecks,
            keywords: ["queue", "approvals", "running", "failed", "scheduled"],
            navItemId: "seo-so-operations",
          },
          {
            href: "/admin/seo/search-operations/pages",
            label: "Pages",
            icon: FileText,
            keywords: ["url inspector", "serp", "indexing", "impact simulation"],
            navItemId: "seo-so-pages",
          },
          {
            href: "/admin/seo/search-operations/entities",
            label: "Entities",
            icon: Share2,
            keywords: ["entity cms", "organization", "merge", "schema publish"],
            navItemId: "seo-so-entities",
          },
          {
            href: "/admin/seo/search-operations/content",
            label: "Content",
            icon: Target,
            keywords: ["topics", "ai audit", "internal links", "drafts"],
            navItemId: "seo-so-content",
          },
          {
            href: "/admin/seo/search-operations/google",
            label: "Google Ops",
            icon: LineChart,
            keywords: ["search console", "business profile", "pagespeed", "indexing api"],
            navItemId: "seo-so-google",
          },
          {
            href: "/admin/seo/search-operations/monitoring",
            label: "Monitoring",
            icon: Activity,
            keywords: ["incidents", "authority", "performance", "alerts"],
            navItemId: "seo-so-monitoring",
          },
          {
            href: "/admin/seo/search-operations/automation",
            label: "Automation",
            icon: Zap,
            keywords: ["workflows", "rules", "triggers", "scheduled jobs"],
            navItemId: "seo-so-automation",
          },
          {
            href: "/admin/seo/search-operations/settings",
            label: "Ops Settings",
            icon: Tags,
            keywords: ["approval policy", "risk", "promotion", "environments"],
            navItemId: "seo-so-settings",
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        href: "/admin/settings/site",
        label: "Site access",
        icon: EyeOff,
        keywords: ["coming soon", "maintenance", "launch", "visibility", "public"],
        navItemId: "site-access",
      },
      {
        href: "/admin/settings/search",
        label: "Search",
        icon: Search,
        keywords: ["search", "index", "autocomplete", "ranking", "filters", "catalog"],
        navItemId: "search-settings",
      },
      {
        href: "/admin/settings/account",
        label: "Admin account",
        icon: UserCog,
        keywords: ["password", "email", "credentials", "login"],
        navItemId: "admin-account",
      },
      {
        href: "/admin/settings/email-accounts",
        label: "Email Accounts",
        icon: Mail,
        keywords: ["email", "smtp", "resend", "notifications", "forms", "mail"],
        navItemId: "email-accounts",
      },
      {
        href: "/admin/users",
        label: "Customer accounts",
        icon: Users,
        keywords: ["registration", "customers", "users", "password"],
        navItemId: "customer-accounts",
      },
      {
        href: "/admin/settings/portal",
        label: "Visitor portal",
        icon: UserCog,
        keywords: ["registration", "signup", "password reset", "email"],
        navItemId: "visitor-portal",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/languages", label: "Languages", icon: Languages, keywords: ["i18n", "locale"], navItemId: "languages" },
      { href: "/admin/translations", label: "Translations", icon: Languages, keywords: ["i18n", "translate", "missing"], navItemId: "translations" },
      { href: "/admin/company", label: "Company Info", icon: Building2, keywords: ["about", "contact"], navItemId: "company-info" },
      { href: "/admin/database", label: "Data Platform", icon: Database, keywords: ["storage", "backup", "json", "schema", "platform"], navItemId: "database" },
      {
        href: "/admin/performance",
        label: "Performance",
        icon: Activity,
        keywords: ["vitals", "lcp", "cls", "inp", "bundle", "navigation", "metrics"],
        navItemId: "performance",
      },
      {
        href: "/admin/demo-profiles",
        label: "Demo Profiles",
        icon: Rocket,
        keywords: ["demo", "template", "import", "seed"],
        navItemId: "demo-profiles",
      },
    ],
  },
];

function isNavItemVisibleForProfile(item: AdminNavItem): boolean {
  if (!isAdminHrefEnabled(item.href)) return false;
  if (item.navItemId && !isAdminNavItemEnabled(item.navItemId)) return false;
  return true;
}

/** Admin nav groups filtered by the active deployment profile. */
export function getAdminNavGroupsForProfile(): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => {
    if (group.sections?.length) {
      const sections = group.sections
        .map((section) => ({
          ...section,
          items: section.items.filter(isNavItemVisibleForProfile),
        }))
        .filter((section) => section.items.length > 0);
      return { ...group, items: [], sections };
    }
    return {
      ...group,
      items: group.items.filter(isNavItemVisibleForProfile),
    };
  }).filter((group) => {
    if (group.sections?.length) return group.sections.length > 0;
    return group.items.length > 0;
  });
}

export function getAdminNavItemsForProfile(): AdminNavItem[] {
  return getAdminNavGroupsForProfile().flatMap((group) => flattenGroupItems(group));
}

function flattenGroupItems(group: AdminNavGroup): AdminNavItem[] {
  if (group.sections?.length) {
    return group.sections.flatMap((section) => section.items);
  }
  return group.items;
}

export const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ADMIN_DASHBOARD,
  ...ADMIN_NAV_GROUPS.flatMap((group) => flattenGroupItems(group)),
];

export const ADMIN_NAV_GROUP_IDS = ADMIN_NAV_GROUPS.map((g) => g.id);

function resolveNavGroups(): AdminNavGroup[] {
  return getAdminNavGroupsForProfile();
}

function resolveAllNavItems(): AdminNavItem[] {
  const items = getAdminNavItemsForProfile();
  return isNavItemVisibleForProfile(ADMIN_DASHBOARD)
    ? [ADMIN_DASHBOARD, ...items]
    : items;
}

function navItemMatchesPath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Nav group containing the current route, if any. */
export function findNavGroupIdByPath(pathname: string): string | null {
  for (const group of resolveNavGroups()) {
    const items = flattenGroupItems(group);
    if (items.some((item) => navItemMatchesPath(pathname, item.href))) {
      return group.id;
    }
  }
  return null;
}

/** Nav section id containing the current route within a group, if any. */
export function findNavSectionIdByPath(pathname: string): string | null {
  for (const group of resolveNavGroups()) {
    if (!group.sections?.length) continue;
    for (const section of group.sections) {
      if (section.items.some((item) => navItemMatchesPath(pathname, item.href))) {
        return `${group.id}:${section.id}`;
      }
    }
  }
  return null;
}

export function findNavItemByPath(pathname: string): AdminNavItem | undefined {
  const items = resolveAllNavItems();
  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact;

  return items
    .filter((item) => item.href !== "/admin" && navItemMatchesPath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: "Admin", href: "/admin" }];
  const contentTypeLabelBySlug: Record<string, string> = {
    "catalog-items": "Packages",
    listings: "Properties",
    offerings: "Services",
  };

  if (pathname === "/admin") {
    crumbs.push({ label: "Dashboard" });
    return crumbs;
  }

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  let currentPath = "/admin";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const item = findNavItemByPath(currentPath);
    const shouldUseContentTypeLabel =
      segments[0] === "content" &&
      segments.length >= 2 &&
      segment === segments[1] &&
      Boolean(contentTypeLabelBySlug[segment]);
    const fallbackLabel = shouldUseContentTypeLabel
      ? contentTypeLabelBySlug[segment]
      : segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({
      label: item?.label ?? fallbackLabel,
      href: currentPath === pathname ? undefined : currentPath,
    });
  }

  return crumbs;
}

function itemMatchesQuery(item: AdminNavItem, q: string): boolean {
  return (
    item.label.toLowerCase().includes(q) ||
    item.href.toLowerCase().includes(q) ||
    item.keywords?.some((k) => k.includes(q)) === true
  );
}

export function filterNavItems(query: string): { group: AdminNavGroup; items: AdminNavItem[] }[] {
  const q = query.trim().toLowerCase();
  const groups = resolveNavGroups();
  if (!q) {
    return groups.map((group) => ({ group, items: flattenGroupItems(group) }));
  }

  return groups
    .map((group) => {
      if (group.sections?.length) {
        const sections = group.sections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => itemMatchesQuery(item, q)),
          }))
          .filter((section) => section.items.length > 0);
        return {
          group: { ...group, sections, items: [] },
          items: sections.flatMap((section) => section.items),
        };
      }
      return {
        group,
        items: group.items.filter((item) => itemMatchesQuery(item, q)),
      };
    })
    .filter(({ items }) => items.length > 0);
}
