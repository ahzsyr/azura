import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";

export const ArticleBuilder = {
  id: "article",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return ctx.page.pageType === "blog" && Boolean(ctx.page.article);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const article = ctx.page.article;
    if (!article) return [];

    return [
      {
        "@type": "Article",
        "@id": entityUrl("article", ctx),
        headline: article.headline,
        datePublished: article.datePublished,
        ...(article.dateModified ? { dateModified: article.dateModified } : {}),
        ...(article.authorName
          ? { author: { "@type": "Person", name: article.authorName } }
          : {}),
        ...(article.imageUrl
          ? {
              image: {
                "@type": "ImageObject",
                url: article.imageUrl,
              },
            }
          : {}),
        isPartOf: entityRef("website", ctx),
        publisher: entityRef("organization", ctx),
      },
    ];
  },
};
