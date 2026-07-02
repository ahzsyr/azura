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

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
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
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText, keywords: ["cms", "content"], navItemId: "pages" },
      { href: "/admin/posts", label: "Blog", icon: Newspaper, keywords: ["posts", "articles"], navItemId: "blog" },
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
        keywords: ["services", "content items"],
        navItemId: "services",
      },
      { href: "/admin/team", label: "Team", icon: Users, keywords: ["directory", "staff"], navItemId: "team" },
      { href: "/admin/partners", label: "Partners", icon: Handshake, keywords: ["partners", "program"], navItemId: "partners" },
      { href: "/admin/knowledge-base", label: "Knowledge Base", icon: BookOpen, keywords: ["kb", "articles", "help"], navItemId: "knowledge-base" },
      { href: "/admin/pricing-plans", label: "Pricing Plans", icon: DollarSign, keywords: ["pricing", "plans"], navItemId: "pricing-plans" },
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
        keywords: ["hotels", "properties", "entities"],
        navItemId: "properties",
      },
      { href: "/admin/releases", label: "Releases", icon: Rocket, keywords: ["changelog", "versions"], navItemId: "releases" },
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
      { href: "/admin/forms", label: "Form Templates", icon: FormInput, keywords: ["forms", "builder", "lead", "contact"], navItemId: "form-templates" },
      { href: "/admin/form-submissions", label: "Form Submissions", icon: Inbox, keywords: ["submissions", "leads", "inbox"], navItemId: "form-submissions" },
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
    items: [
      {
        href: "/admin/seo/metadata",
        label: "SEO Dashboard",
        icon: LayoutDashboard,
        keywords: ["meta", "hub", "overview", "seo"],
        navItemId: "seo-overview",
      },
      {
        href: "/admin/seo/audit",
        label: "SEO Audit",
        icon: Search,
        keywords: ["analysis", "audit", "score"],
        navItemId: "seo-audit",
      },
      {
        href: "/admin/seo/redirects",
        label: "Redirects",
        icon: Route,
        keywords: ["urls", "301", "302"],
        navItemId: "seo-redirects",
      },
      {
        href: "/admin/seo/robots",
        label: "Robots.txt",
        icon: Bot,
        keywords: ["crawl", "robots", "disallow"],
        navItemId: "seo-robots",
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
        keywords: ["google analytics", "gtag", "gtm", "tag manager", "ga4", "tracking", "search console", "gsc"],
        navItemId: "seo-google",
      },
      {
        href: "/admin/seo/integrations",
        label: "SEO Integration",
        icon: Activity,
        keywords: ["bing", "indexnow", "queue", "monitoring"],
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
      {
        href: "/admin/content",
        label: "Content Types",
        icon: Layers,
        keywords: ["catalog", "types", "schema", "fields", "developer"],
        navItemId: "content-types",
      },
      { href: "/admin/languages", label: "Languages", icon: Languages, keywords: ["i18n", "locale"], navItemId: "languages" },
      { href: "/admin/translations", label: "Translations", icon: Languages, keywords: ["i18n", "translate", "missing"], navItemId: "translations" },
      { href: "/admin/company", label: "Company Info", icon: Building2, keywords: ["about", "contact"], navItemId: "company-info" },
      { href: "/admin/database", label: "Database", icon: Database, keywords: ["storage", "backup"], navItemId: "database" },
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
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(isNavItemVisibleForProfile),
  })).filter((group) => group.items.length > 0);
}

export function getAdminNavItemsForProfile(): AdminNavItem[] {
  return getAdminNavGroupsForProfile().flatMap((group) => group.items);
}

export const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ADMIN_DASHBOARD,
  ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
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
    if (group.items.some((item) => navItemMatchesPath(pathname, item.href))) {
      return group.id;
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

  if (pathname === "/admin") {
    crumbs.push({ label: "Dashboard" });
    return crumbs;
  }

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  let currentPath = "/admin";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const item = findNavItemByPath(currentPath);
    crumbs.push({
      label: item?.label ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href: currentPath === pathname ? undefined : currentPath,
    });
  }

  return crumbs;
}

export function filterNavItems(query: string): { group: AdminNavGroup; items: AdminNavItem[] }[] {
  const q = query.trim().toLowerCase();
  const groups = resolveNavGroups();
  if (!q) {
    return groups.map((group) => ({ group, items: group.items }));
  }

  return groups
    .map((group) => ({
      group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.includes(q)),
      ),
    }))
    .filter(({ items }) => items.length > 0);
}
