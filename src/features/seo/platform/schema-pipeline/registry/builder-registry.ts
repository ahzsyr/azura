import type { SchemaBuilder } from "../types";
import { isBuilderEnabled, resolveSchemaBuilderFlags } from "./feature-flags";
import type { SeoStructuredConfig } from "@/features/seo/types";

import { OrganizationBuilder } from "../builders/organization.builder";
import { LocalBusinessBuilder } from "../builders/local-business.builder";
import { WebsiteBuilder } from "../builders/website.builder";
import { WebPageBuilder } from "../builders/webpage.builder";
import { BreadcrumbBuilder } from "../builders/breadcrumb.builder";
import { FaqBuilder } from "../builders/faq.builder";
import { ImageObjectBuilder } from "../builders/image.builder";
import { SearchActionBuilder } from "../builders/search-action.builder";
import { ProductBuilder } from "../builders/product.builder";
import { ArticleBuilder } from "../builders/article.builder";
import { VideoObjectBuilder } from "../builders/video.builder";
import { ReviewBuilder } from "../builders/review.builder";

const ALL_BUILDERS: SchemaBuilder[] = [
  OrganizationBuilder,
  LocalBusinessBuilder,
  ImageObjectBuilder,
  WebsiteBuilder,
  SearchActionBuilder,
  WebPageBuilder,
  BreadcrumbBuilder,
  FaqBuilder,
  ProductBuilder,
  ArticleBuilder,
  VideoObjectBuilder,
  ReviewBuilder,
];

export function getActiveBuilders(config?: SeoStructuredConfig): SchemaBuilder[] {
  const flags = resolveSchemaBuilderFlags(config);
  const versionPins = config?.builderVersions ?? {};

  const byId = new Map<string, SchemaBuilder>();
  for (const builder of ALL_BUILDERS) {
    const pinnedVersion = versionPins[builder.id];
    if (pinnedVersion !== undefined && builder.version !== pinnedVersion) continue;
    const existing = byId.get(builder.id);
    if (!existing || builder.version > existing.version) {
      byId.set(builder.id, builder);
    }
  }

  return [...byId.values()].filter((builder) => isBuilderEnabled(builder.id, flags));
}

export function listRegisteredBuilders(): SchemaBuilder[] {
  return ALL_BUILDERS;
}
