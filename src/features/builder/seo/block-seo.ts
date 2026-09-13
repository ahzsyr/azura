import type { BlockSeoSettings } from "@/types/block-system";

export type BlockSeoPayload = {
  jsonLd?: Record<string, unknown>[];
  meta?: { name?: string; content?: string; property?: string }[];
  canonical?: string;
};

export function resolveBlockSeo(seo: BlockSeoSettings | undefined): BlockSeoPayload {
  if (!seo) return {};

  const payload: BlockSeoPayload = {};
  const jsonLd: Record<string, unknown>[] = [];

  if (seo.structuredData) {
    jsonLd.push(seo.structuredData);
  } else if (seo.schemaOrgType) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": seo.schemaOrgType,
    });
  }

  if (jsonLd.length) payload.jsonLd = jsonLd;

  const meta: BlockSeoPayload["meta"] = [];
  if (seo.indexing === "noindex") {
    meta.push({ name: "robots", content: "noindex" });
  }
  if (seo.openGraph?.title) {
    meta.push({ property: "og:title", content: seo.openGraph.title });
  }
  if (seo.openGraph?.description) {
    meta.push({ property: "og:description", content: seo.openGraph.description });
  }
  if (seo.openGraph?.image) {
    meta.push({ property: "og:image", content: seo.openGraph.image });
  }
  if (meta.length) payload.meta = meta;

  if (seo.canonicalOverride) payload.canonical = seo.canonicalOverride;

  return payload;
}
