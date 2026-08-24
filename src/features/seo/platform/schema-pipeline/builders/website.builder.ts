import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";

function absoluteImageUrl(url: string, ctx: SchemaContext): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = ctx.runtime.siteOrigin.replace(/\/$/, "");
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export const ImageObjectBuilder = {
  id: "image",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return Boolean(ctx.site.logoUrl || ctx.site.businessPhotos.length);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const nodes: SchemaNode[] = [];

    if (ctx.site.logoUrl) {
      nodes.push({
        "@type": "ImageObject",
        "@id": entityUrl("logo-image", ctx),
        url: absoluteImageUrl(ctx.site.logoUrl, ctx),
        caption: `${ctx.site.brand.brandName} logo`,
      });
    }

    for (const photo of ctx.site.businessPhotos) {
      const key = `image-${photo.role}-${photo.url}` as const;
      nodes.push({
        "@type": "ImageObject",
        "@id": entityUrl(key, ctx),
        url: absoluteImageUrl(photo.url, ctx),
        ...(photo.width ? { width: photo.width } : {}),
        ...(photo.height ? { height: photo.height } : {}),
        ...(photo.caption ? { caption: photo.caption } : {}),
      });
    }

    return nodes;
  },
};

export const WebsiteBuilder = {
  id: "website",
  version: 1,
  supports(_ctx: SchemaContext): boolean {
    return true;
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const alternateName = ctx.site.brand.brandShort?.trim();
    return [
      {
        "@type": "WebSite",
        "@id": entityUrl("website", ctx),
        name: ctx.site.brand.brandName,
        ...(alternateName && alternateName !== ctx.site.brand.brandName
          ? { alternateName }
          : {}),
        url: ctx.runtime.siteOrigin,
        publisher: entityRef("organization", ctx),
      },
    ];
  },
};

export const WebPageBuilder = {
  id: "webpage",
  version: 1,
  supports(_ctx: SchemaContext): boolean {
    return true;
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const primaryImage =
      ctx.site.businessPhotos[0] != null
        ? entityRef(`image-${ctx.site.businessPhotos[0].role}-${ctx.site.businessPhotos[0].url}`, ctx)
        : ctx.site.logoUrl
          ? entityRef("logo-image", ctx)
          : undefined;

    return [
      {
        "@type": "WebPage",
        "@id": entityUrl("webpage", ctx),
        url: ctx.runtime.canonicalUrl,
        name: ctx.page.title,
        description: ctx.page.description || undefined,
        isPartOf: entityRef("website", ctx),
        about: entityRef("organization", ctx),
        ...(ctx.page.breadcrumbItems.length
          ? { breadcrumb: entityRef("breadcrumb", ctx) }
          : {}),
        ...(primaryImage ? { primaryImageOfPage: primaryImage } : {}),
        ...(ctx.page.faqItems.length ? { mainEntity: entityRef("faqpage", ctx) } : {}),
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
