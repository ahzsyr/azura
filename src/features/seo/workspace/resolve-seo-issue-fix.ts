import { getStaticSeoPage, isStaticSeoPageKey, STATIC_SEO_PAGES } from "@/features/seo/constants";
import { routing } from "@/i18n/routing";

export type SeoMetaEditTarget = {
  pageKey?: string | null;
  cmsPageId?: string | null;
  postId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export type SeoIssueFixInfo = {
  fixHref: string;
  fixLabel: string;
  suggestion: string;
};

/** Shared admin edit URL for SeoMeta-linked entities. */
export function editHrefForSeoMeta(meta: SeoMetaEditTarget): string {
  const pageKey = meta.pageKey?.trim();
  if (pageKey?.startsWith("product:")) {
    const slug = pageKey.slice("product:".length).trim();
    return slug ? `/admin/products?product=${encodeURIComponent(slug)}#seo` : "/admin/products";
  }
  if (pageKey && isStaticSeoPageKey(pageKey)) {
    return `/admin/seo/metadata?tab=pages&page=${encodeURIComponent(pageKey)}`;
  }
  if (pageKey) {
    return `/admin/seo/metadata?tab=pages&page=${encodeURIComponent(pageKey)}`;
  }
  if (meta.cmsPageId) return `/admin/pages/${meta.cmsPageId}`;
  if (meta.postId) return `/admin/posts/${meta.postId}`;
  if (meta.entityType === "product" && meta.entityId) {
    return `/admin/products?product=${encodeURIComponent(meta.entityId)}#seo`;
  }
  return "/admin/seo/metadata";
}

/** Best-effort public path for a pageKey (locale-prefixed). */
export function publicPathForPageKey(pageKey: string | null | undefined): string | undefined {
  if (!pageKey) return undefined;
  if (pageKey.startsWith("product:")) {
    const slug = pageKey.slice("product:".length).trim();
    return slug ? `/${routing.defaultLocale}/products/${slug}` : undefined;
  }
  if (isStaticSeoPageKey(pageKey)) {
    const page = getStaticSeoPage(pageKey);
    if (!page) return undefined;
    return `/${routing.defaultLocale}${page.path || ""}` || `/${routing.defaultLocale}`;
  }
  return undefined;
}

function pageKeyFromAdminHref(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, "http://local");
    return url.searchParams.get("page") ?? undefined;
  } catch {
    return undefined;
  }
}

function productSlugFromContext(href?: string, source?: string): string | undefined {
  const pageKey = pageKeyFromAdminHref(href);
  if (pageKey?.startsWith("product:")) return pageKey.slice("product:".length).trim() || undefined;
  if (source?.includes("/products/")) {
    try {
      const path = new URL(source).pathname;
      const match = path.match(/\/products\/([^/]+)/);
      return match?.[1];
    } catch {
      // ignore
    }
  }
  return undefined;
}

function staticPageKeyFromPublicUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const path = new URL(url).pathname.replace(/\/$/, "") || "/";
    const withoutLocale = path.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
    for (const page of STATIC_SEO_PAGES) {
      const expected = page.path || "";
      if (withoutLocale === expected || withoutLocale === `${expected}/`) return page.pageKey;
      if (page.pageKey === "home" && (withoutLocale === "/" || withoutLocale === "")) return "home";
    }
  } catch {
    // ignore
  }
  return undefined;
}

function hasLocalePrefixedPath(urlOrPath?: string): boolean {
  if (!urlOrPath?.trim()) return false;
  try {
    const path = urlOrPath.startsWith("http")
      ? new URL(urlOrPath).pathname
      : urlOrPath.startsWith("/")
        ? urlOrPath
        : `/${urlOrPath}`;
    const segment = path.replace(/^\//, "").split("/")[0]?.toLowerCase();
    return Boolean(segment && routing.locales.map(String).includes(segment));
  } catch {
    return false;
  }
}

/**
 * Resolve fix action + suggestion for a quality/workspace issue.
 * Prefer analyzer-provided href; fall back to title/source heuristics.
 */
export function resolveSeoIssueFix(input: {
  title: string;
  message?: string;
  href?: string;
  source?: string;
  pageUrl?: string;
  entityType?: string;
  entityId?: string;
}): SeoIssueFixInfo | null {
  const title = input.title.toLowerCase();
  const href = input.href;
  const source = input.source ?? input.pageUrl;
  const productSlug = productSlugFromContext(href, source);
  const canonicalAlreadyLocalePrefixed = hasLocalePrefixedPath(source) || hasLocalePrefixedPath(input.message);

  if (title.includes("product schema is incomplete") || (title.includes("schema") && productSlug)) {
    const fixHref =
      href ??
      (productSlug
        ? `/admin/products?product=${encodeURIComponent(productSlug)}#seo`
        : "/admin/seo/structured-data");
    return {
      fixHref,
      fixLabel: "Fix schema",
      suggestion:
        productSlug
          ? "Remove incomplete custom JSON-LD or add name and offers. The product schema pipeline generates valid Product JSON-LD automatically when the override is cleared."
          : "Edit JSON-LD so Product schema includes name and offers.",
    };
  }

  if (title.includes("json-ld missing") || title.includes("breadcrumb schema") || title.includes("schema is incomplete")) {
    const isGlobal = (source ?? "").toLowerCase().includes("global");
    return {
      fixHref: href ?? (isGlobal ? "/admin/seo/structured-data" : "/admin/seo/metadata"),
      fixLabel: isGlobal ? "Edit structured data" : "Edit SEO",
      suggestion: input.message ?? "Complete the JSON-LD fields required for this schema type.",
    };
  }

  if (title.includes("duplicate canonical")) {
    const pageKey = pageKeyFromAdminHref(href);
    return {
      fixHref: href ?? (pageKey ? editHrefForSeoMeta({ pageKey }) : "/admin/seo/metadata?tab=pages"),
      fixLabel: "Fix canonical",
      suggestion: "Assign a unique canonical URL to each SEO record. Only one page should claim a given canonical.",
    };
  }

  if (title.includes("canonical target may be unreachable")) {
    const fixHref =
      href ??
      (productSlug
        ? `/admin/products?product=${encodeURIComponent(productSlug)}#seo`
        : "/admin/seo/metadata?tab=pages");
    return {
      fixHref,
      fixLabel: "Review canonical",
      suggestion: canonicalAlreadyLocalePrefixed
        ? "Canonical already includes a locale prefix. Verify the URL returns 200 in a browser, then re-run the site audit — probe timeouts can produce false positives."
        : productSlug
          ? `Update the canonical to include the locale prefix (e.g. /${routing.defaultLocale}/products/${productSlug}), then verify it loads.`
          : "Verify the page is published and the canonical URL matches the live locale-prefixed sitemap URL.",
    };
  }

  if (title.includes("canonical")) {
    if (productSlug && !canonicalAlreadyLocalePrefixed) {
      const expected = `/${routing.defaultLocale}/products/${productSlug}`;
      return {
        fixHref: href ?? `/admin/products?product=${encodeURIComponent(productSlug)}#seo`,
        fixLabel: "Fix canonical",
        suggestion: `Update the canonical to include the locale prefix (e.g. ${expected}). Relative paths like /products/... resolve without /en/.`,
      };
    }
    return {
      fixHref: href ?? "/admin/seo/metadata?tab=pages",
      fixLabel: "Review canonical",
      suggestion: canonicalAlreadyLocalePrefixed
        ? "Canonical already includes a locale prefix. Confirm it matches the public product URL and re-run the audit if probes still fail."
        : "Verify the page is published and the canonical URL matches the live locale-prefixed sitemap URL.",
    };
  }

  if (title.includes("sitemap url may be broken") || title.includes("crawl failure")) {
    return {
      fixHref: source?.startsWith("http") ? source : "/admin/seo/technical",
      fixLabel: source?.startsWith("http") ? "Open page" : "Technical audit",
      suggestion: "Verify the page loads in a browser, then re-run the site audit. Probe timeouts can produce false positives.",
    };
  }

  if (title.includes("orphan page")) {
    const pageKey = staticPageKeyFromPublicUrl(source) ?? pageKeyFromAdminHref(href);
    return {
      fixHref: pageKey
        ? editHrefForSeoMeta({ pageKey })
        : source?.startsWith("http")
          ? source
          : "/admin/seo/metadata?tab=pages",
      fixLabel: pageKey ? "Edit page SEO" : "Open page",
      suggestion:
        "Add an internal link from the header or footer, or mark the page noindex and exclude it from the sitemap if it should not be indexed.",
    };
  }

  if (title.includes("hreflang")) {
    const pageKey = staticPageKeyFromPublicUrl(source) ?? "account";
    return {
      fixHref: editHrefForSeoMeta({ pageKey }),
      fixLabel: "Edit page SEO",
      suggestion: "Ensure the page uses the locale layout and buildMetadata() so hreflang alternates are rendered.",
    };
  }

  if (href) {
    return {
      fixHref: href,
      fixLabel: "Fix",
      suggestion: input.message ?? "Review and resolve this SEO issue in the linked editor.",
    };
  }

  if (input.entityType && input.entityId) {
    if (input.entityType.toLowerCase() === "product") {
      return {
        fixHref: `/admin/products?product=${encodeURIComponent(input.entityId)}#seo`,
        fixLabel: "Edit product SEO",
        suggestion: input.message ?? "Review SEO settings for this product.",
      };
    }
    return {
      fixHref: `/admin/content/${encodeURIComponent(input.entityType)}/${encodeURIComponent(input.entityId)}`,
      fixLabel: "Edit content",
      suggestion: input.message ?? "Review SEO settings for this content item.",
    };
  }

  return null;
}

/** Attach fix fields onto a quality issue using title/href/source. */
export function withResolvedFix<T extends { title: string; message: string; href?: string; source?: string; fixHref?: string; fixLabel?: string; suggestion?: string }>(
  issue: T,
): T & Partial<SeoIssueFixInfo> {
  if (issue.fixHref && issue.fixLabel && issue.suggestion) return issue;
  const fix = resolveSeoIssueFix(issue);
  if (!fix) return issue;
  return {
    ...issue,
    fixHref: issue.fixHref ?? fix.fixHref,
    fixLabel: issue.fixLabel ?? fix.fixLabel,
    suggestion: issue.suggestion ?? fix.suggestion,
    href: issue.href ?? (fix.fixHref.startsWith("/admin") ? fix.fixHref : issue.href),
  };
}
