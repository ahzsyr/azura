import type { ContentSnapshot, SeoExecutionContext } from "../../types";

export type StructuredDataObject = Record<string, unknown>;

function entitySchemaType(ctx: SeoExecutionContext): string {
  const kind = ctx.entityType.toLowerCase();
  if (kind.includes("product")) return "Product";
  if (kind.includes("post")) return "Article";
  if (kind === "cms_page" || kind.includes("page")) return "WebPage";
  return "WebPage";
}

export function buildStructuredDataObject(input: {
  ctx: SeoExecutionContext;
  snapshot: ContentSnapshot;
  title: string;
  description: string;
  canonicalUrl?: string;
  imageUrl?: string;
}): StructuredDataObject {
  const type = entitySchemaType(input.ctx);
  const base: StructuredDataObject = {
    "@context": "https://schema.org",
    "@type": type,
    name: input.title,
    description: input.description,
  };

  if (input.canonicalUrl?.trim()) {
    base.url = input.canonicalUrl.trim();
  }
  if (input.imageUrl?.trim()) {
    base.image = input.imageUrl.trim();
  }
  if (type === "Article") {
    base.headline = input.title;
    base.articleBody = input.description;
  }
  if (input.snapshot.faq.length > 0) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: input.snapshot.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    };
  }

  return base;
}

export function serializeStructuredData(data: StructuredDataObject | StructuredDataObject[]): string {
  return JSON.stringify(data, null, 2);
}
