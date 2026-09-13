import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";

export const BrandBuilder = {
  id: "brand",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return Boolean(ctx.site.brand.brandName);
  },
  provenance() {
    return { name: "theme.brand" };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const brandName = ctx.site.brand.brandName;
    if (!brandName) return [];

    return [
      {
        "@type": "Brand",
        "@id": entityUrl("brand", ctx),
        name: brandName,
        ...(ctx.site.logoUrl ? { logo: entityRef("logo", ctx) } : {}),
      },
    ];
  },
};
