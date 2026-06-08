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
  Sparkles,
  Wand2,
  Loader2,
  Search,
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
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
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
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText, keywords: ["cms", "content"] },
      { href: "/admin/posts", label: "Blog", icon: Newspaper, keywords: ["posts", "articles"] },
      { href: "/admin/media", label: "Media", icon: Image, keywords: ["files", "uploads"] },
      { href: "/admin/gallery", label: "Gallery", icon: Image, keywords: ["photos", "images"] },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle, keywords: ["questions"] },
      { href: "/admin/testimonials", label: "Testimonials", icon: Star, keywords: ["reviews"] },
    ],
  },
  {
    id: "product-catalog",
    label: "Product Catalog",
    items: [
      {
        href: "\/admin\/products",
        label: "Products",
        icon: Package,
        keywords: ["products", "sku", "json", "catalog"],
      },
      {
        href: "\/admin\/collections",
        label: "Collections",
        icon: Layers,
        keywords: ["collections", "rules", "json"],
      },
      {
        href: "/admin/catalog-taxonomy",
        label: "Brands & Tags",
        icon: Tags,
        keywords: ["brands", "tags", "taxonomy", "catalog"],
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      {
        href: "/admin/content",
        label: "Content",
        icon: Layers,
        keywords: ["catalog", "collections", "items", "listings", "offerings", "types", "schema", "fields"],
      },
      {
        href: "/admin/content/catalog-items",
        label: "Catalog Items",
        icon: Package,
        keywords: ["packages", "products", "tours"],
      },
      {
        href: "/admin/content/listings",
        label: "Listings",
        icon: Hotel,
        keywords: ["hotels", "properties", "entities"],
      },
      {
        href: "/admin/content/offerings",
        label: "Offerings",
        icon: Briefcase,
        keywords: ["services", "content items"],
      },
      { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, keywords: ["leads", "contacts"] },
      { href: "/admin/forms", label: "Form Templates", icon: FormInput, keywords: ["forms", "builder", "lead", "contact"] },
      { href: "/admin/form-submissions", label: "Form Submissions", icon: Inbox, keywords: ["submissions", "leads", "inbox"] },
      { href: "/admin/newsletter", label: "Newsletter", icon: MailPlus, keywords: ["email", "subscribers", "signup"] },
    ],
  },
  {
    id: "portal",
    label: "Portal",
    items: [
      { href: "/admin/pricing-plans", label: "Pricing Plans", icon: DollarSign, keywords: ["pricing", "plans"] },
      { href: "/admin/releases", label: "Releases", icon: Rocket, keywords: ["changelog", "versions"] },
      {
        href: "/admin/pricing-calculators",
        label: "Calculators",
        icon: Calculator,
        keywords: ["calculator", "pricing"],
      },
      { href: "/admin/knowledge-base", label: "Knowledge Base", icon: BookOpen, keywords: ["kb", "articles"] },
      { href: "/admin/documentation", label: "Documentation", icon: FileText, keywords: ["docs", "portal"] },
      { href: "/admin/status", label: "Status", icon: Activity, keywords: ["uptime", "incidents"] },
      { href: "/admin/team", label: "Team", icon: Users, keywords: ["directory", "staff"] },
      { href: "/admin/partners", label: "Partners", icon: Handshake, keywords: ["partners", "program"] },
    ],
  },
  {
    id: "design",
    label: "Design & Builder",
    items: [
      { href: "/admin/studio", label: "Studio", icon: MonitorPlay, keywords: ["preview", "editor"] },
      { href: "/admin/header", label: "Header Builder", icon: PanelTop, keywords: ["navigation", "menu"] },
      { href: "/admin/footer", label: "Footer Builder", icon: PanelBottom, keywords: ["footer", "navigation"] },
      {
        href: "/admin/theme",
        label: "Theme Studio",
        icon: Palette,
        keywords: ["theme", "colors", "branding", "presets", "typography", "motion", "effects"],
      },
      { href: "/admin/personalization", label: "Personalization", icon: Wand2, keywords: ["customize"] },
      {
        href: "/admin/preloader",
        label: "Preloader",
        icon: Loader2,
        keywords: ["loading", "splash", "spinner", "preload"],
      },
      {
        href: "/admin/settings/whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
        keywords: ["whatsapp", "fab", "chat", "inquiry", "button"],
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    items: [
      { href: "/admin/seo", label: "SEO", icon: Search, keywords: ["meta", "search"] },
      { href: "/admin/seo/audit", label: "SEO Audit", icon: Search, keywords: ["analysis"] },
      { href: "/admin/seo/redirects", label: "Redirects", icon: Route, keywords: ["urls"] },
      { href: "/admin/seo/robots", label: "Robots.txt", icon: Bot, keywords: ["crawl"] },
      { href: "/admin/seo/structured-data", label: "Structured Data", icon: Braces, keywords: ["schema", "json-ld"] },
      { href: "/admin/seo/404", label: "404 Pages", icon: AlertCircle, keywords: ["not found"] },
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
      },
      {
        href: "/admin/settings/search",
        label: "Search",
        icon: Search,
        keywords: ["search", "index", "autocomplete", "ranking", "filters", "catalog"],
      },
      {
        href: "/admin/settings/account",
        label: "Admin account",
        icon: UserCog,
        keywords: ["password", "email", "credentials", "login"],
      },
      {
        href: "/admin/users",
        label: "Customer accounts",
        icon: Users,
        keywords: ["registration", "customers", "users", "password"],
      },
      {
        href: "/admin/settings/portal",
        label: "Visitor portal",
        icon: UserCog,
        keywords: ["registration", "signup", "password reset", "email"],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/languages", label: "Languages", icon: Languages, keywords: ["i18n", "locale"] },
      { href: "/admin/translations", label: "Translations", icon: Languages, keywords: ["i18n", "translate", "missing"] },
      { href: "/admin/ui-messages", label: "UI Messages", icon: Languages, keywords: ["i18n", "strings", "ui"] },
      { href: "/admin/company", label: "Company Info", icon: Building2, keywords: ["about", "contact"] },
      { href: "/admin/database", label: "Database", icon: Database, keywords: ["storage", "backup"] },
      {
        href: "/admin/demo-profiles",
        label: "Demo Profiles",
        icon: Rocket,
        keywords: ["demo", "template", "import", "seed"],
      },
    ],
  },
];

export const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ADMIN_DASHBOARD,
  ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
];

export const ADMIN_NAV_GROUP_IDS = ADMIN_NAV_GROUPS.map((g) => g.id);

function navItemMatchesPath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Nav group containing the current route, if any. */
export function findNavGroupIdByPath(pathname: string): string | null {
  for (const group of ADMIN_NAV_GROUPS) {
    if (group.items.some((item) => navItemMatchesPath(pathname, item.href))) {
      return group.id;
    }
  }
  return null;
}

export function findNavItemByPath(pathname: string): AdminNavItem | undefined {
  const exact = ALL_ADMIN_NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;

  return ALL_ADMIN_NAV_ITEMS
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
  if (!q) {
    return ADMIN_NAV_GROUPS.map((group) => ({ group, items: group.items }));
  }

  return ADMIN_NAV_GROUPS.map((group) => ({
    group,
    items: group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
    ),
  })).filter(({ items }) => items.length > 0);
}
