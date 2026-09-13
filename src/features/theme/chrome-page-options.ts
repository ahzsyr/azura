import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";

export type ChromePageOption = {
  path: string;
  title: string;
  group: string;
};

const PATH_TITLE_OVERRIDES: Record<string, string> = {
  "/": "Home",
  "/about": "About",
  "/contact": "Contact",
  "/products": "Products",
  "/categories": "Categories",
  "/packages": "Packages",
  "/services": "Services",
  "/gallery": "Gallery",
  "/testimonials": "Testimonials",
  "/faqs": "FAQs",
  "/blog": "Blog",
  "/brands": "Brands",
  "/compare": "Compare",
  "/favorites": "Favorites",
  "/account": "Account",
};

export const CHROME_PAGE_PATTERNS: ChromePageOption[] = [
  { path: "/products/[slug]", title: "All product pages", group: "Catalog" },
  { path: "/categories/[slug]", title: "All category pages", group: "Catalog" },
  { path: "/brands/[slug]", title: "All brand pages", group: "Catalog" },
  { path: "/services/[slug]", title: "All service pages", group: "Catalog" },
  { path: "/pages/[slug]", title: "All CMS pages", group: "CMS" },
  { path: "/blog/[slug]", title: "All blog posts", group: "Content" },
];

function titleForPath(path: string, fallback: string): string {
  return PATH_TITLE_OVERRIDES[path] ?? fallback;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Built-in marketing routes plus catalog/CMS patterns. Does not hit the database. */
export function getStaticChromePageOptions(): ChromePageOption[] {
  const byPath = new Map<string, ChromePageOption>();

  for (const [slug, path] of Object.entries(CMS_WIRED_MARKETING_SLUGS)) {
    const publicPath = path || "/";
    if (byPath.has(publicPath)) continue;
    byPath.set(publicPath, {
      path: publicPath,
      title: titleForPath(publicPath, slugToTitle(slug)),
      group: "Marketing",
    });
  }

  for (const page of STATIC_SEO_PAGES) {
    const publicPath = page.path || "/";
    if (byPath.has(publicPath)) continue;
    byPath.set(publicPath, {
      path: publicPath,
      title: page.label,
      group: "Marketing",
    });
  }

  for (const option of CHROME_PAGE_PATTERNS) {
    byPath.set(option.path, option);
  }

  return [...byPath.values()];
}

export function mergeChromePageOptions(
  extra: ChromePageOption[],
  base: ChromePageOption[] = getStaticChromePageOptions(),
): ChromePageOption[] {
  const byPath = new Map(base.map((option) => [option.path, option]));
  for (const option of extra) {
    if (!byPath.has(option.path)) byPath.set(option.path, option);
  }
  return [...byPath.values()];
}

export const CHROME_VISIBILITY_MODE_OPTIONS = [
  { value: "all", label: "All pages" },
  { value: "selected", label: "Selected pages only" },
  { value: "except", label: "All pages except selected" },
] as const;
