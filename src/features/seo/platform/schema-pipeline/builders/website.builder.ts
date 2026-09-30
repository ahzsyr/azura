import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";
import { publicLocalePath } from "@/i18n/url-helpers";

function absoluteImageUrl(url: string, ctx: SchemaContext): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = ctx.runtime.siteOrigin.replace(/\/$/, "");
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export const ImageObjectBuilder = {
  id: "image",
  version: 2,
  supports(ctx: SchemaContext): boolean {
    return Boolean(ctx.site.logoUrl);
  },
  provenance() {
    return { url: "theme.logo" };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    if (!ctx.site.logoUrl) return [];

    return [
      {
        "@type": "ImageObject",
        "@id": entityUrl("logo", ctx),
        url: absoluteImageUrl(ctx.site.logoUrl, ctx),
        caption: `${ctx.site.brand.brandName} logo`,
      },
    ];
  },
};

export const WebsiteBuilder = {
  id: "website",
  version: 1,
  supports(_ctx: SchemaContext): boolean {
    return true;
  },
  provenance() {
    return { name: "theme.brand", url: "site.origin" };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const alternateName = ctx.site.brand.brandShort?.trim();
    const origin = ctx.runtime.siteOrigin.replace(/\/$/, "");
    const localePrefix = ctx.runtime.localePrefix;
    const searchPath = publicLocalePath(localePrefix, "/search");
    const searchTarget = `${origin}${searchPath}?q={search_term_string}`;

    return [
      {
        "@type": "WebSite",
        "@id": entityUrl("website", ctx),
        name: ctx.site.brand.brandName,
        ...(alternateName && alternateName !== ctx.site.brand.brandName
          ? { alternateName }
          : {}),
        url: origin,
        publisher: entityRef("organization", ctx),
        ...(ctx.runtime.publicSearchEnabled
          ? {
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: searchTarget,
                },
                "query-input": "required name=search_term_string",
              },
            }
          : {}),
      },
    ];
  },
};

export const WebPageBuilder = {
  id: "webpage",
  version: 2,
  supports(_ctx: SchemaContext): boolean {
    return true;
  },
  provenance() {
    return { name: "page.title", description: "page.description", url: "page.canonical" };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const primaryImage = ctx.site.logoUrl ? entityRef("logo", ctx) : undefined;
    const hasProduct = ctx.page.pageType === "product" && Boolean(ctx.page.product);
    const hasArticle = ctx.page.pageType === "blog" && Boolean(ctx.page.article);
    const hasFaq = ctx.page.faqItems.length > 0 && !hasProduct && !hasArticle;

    return [
      {
        "@type": "WebPage",
        "@id": entityUrl("webpage", ctx),
        url: ctx.runtime.canonicalUrl,
        ...(ctx.page.title ? { name: ctx.page.title } : {}),
        ...(ctx.page.description ? { description: ctx.page.description } : {}),
        isPartOf: entityRef("website", ctx),
        about: entityRef("organization", ctx),
        ...(ctx.page.breadcrumbItems.length
          ? { breadcrumb: entityRef("breadcrumb", ctx) }
          : {}),
        ...(primaryImage ? { primaryImageOfPage: primaryImage } : {}),
        ...(hasProduct
          ? { mainEntity: entityRef(`product-${ctx.page.product!.id}`, ctx) }
          : hasArticle
            ? { mainEntity: entityRef("article", ctx) }
            : hasFaq
              ? { mainEntity: entityRef("faqpage", ctx) }
              : {}),
      },
    ];
  },
};

export const BreadcrumbBuilder = {
  id: "breadcrumb",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return ctx.page.breadcrumbItems.length > 0;
  },
  provenance() {
    return { itemListElement: "page.breadcrumbs" };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const origin = ctx.runtime.siteOrigin.replace(/\/$/, "");
    return [
      {
        "@type": "BreadcrumbList",
        "@id": entityUrl("breadcrumb", ctx),
        itemListElement: ctx.page.breadcrumbItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.href.startsWith("http") ? item.href : `${origin}${item.href}`,
        })),
      },
    ];
  },
};

export const FaqBuilder = {
  id: "faq",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return ctx.page.faqItems.length > 0;
  },
  provenance() {
    return { mainEntity: "page.faqItems" };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    return [
      {
        "@type": "FAQPage",
        "@id": entityUrl("faqpage", ctx),
        mainEntity: ctx.page.faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ];
  },
};
