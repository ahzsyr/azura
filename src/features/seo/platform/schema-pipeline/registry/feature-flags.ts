import type { SeoStructuredConfig } from "@/features/seo/types";

export type SchemaBuilderFlags = {
  schemaPipeline: boolean;
  organizationBuilder: boolean;
  localBusinessBuilder: boolean;
  websiteBuilder: boolean;
  webPageBuilder: boolean;
  breadcrumbBuilder: boolean;
  faqBuilder: boolean;
  imageObjectBuilder: boolean;
  productBuilder: boolean;
  articleBuilder: boolean;
  videoObjectBuilder: boolean;
  reviewBuilder: boolean;
};

export const DEFAULT_SCHEMA_BUILDER_FLAGS: SchemaBuilderFlags = {
  schemaPipeline: true,
  organizationBuilder: true,
  localBusinessBuilder: true,
  websiteBuilder: true,
  webPageBuilder: true,
  breadcrumbBuilder: true,
  faqBuilder: true,
  imageObjectBuilder: true,
  productBuilder: true,
  articleBuilder: true,
  videoObjectBuilder: true,
  reviewBuilder: true,
};

function envFlag(name: string, defaultValue = true): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== "false" && value !== "0";
}

export function resolveSchemaBuilderFlags(
  config?: SeoStructuredConfig,
): SchemaBuilderFlags {
  const fromConfig = config?.builderFlags ?? {};
  return {
    schemaPipeline: fromConfig.schemaPipeline ?? envFlag("SCHEMA_PIPELINE", true),
    organizationBuilder:
      fromConfig.organizationBuilder ?? envFlag("SCHEMA_ORGANIZATION_BUILDER", true),
    localBusinessBuilder:
      fromConfig.localBusinessBuilder ?? envFlag("SCHEMA_LOCAL_BUSINESS_BUILDER", true),
    websiteBuilder: fromConfig.websiteBuilder ?? envFlag("SCHEMA_WEBSITE_BUILDER", true),
    webPageBuilder: fromConfig.webPageBuilder ?? envFlag("SCHEMA_WEBPAGE_BUILDER", true),
    breadcrumbBuilder: fromConfig.breadcrumbBuilder ?? envFlag("SCHEMA_BREADCRUMB_BUILDER", true),
    faqBuilder: fromConfig.faqBuilder ?? envFlag("SCHEMA_FAQ_BUILDER", true),
    imageObjectBuilder:
      fromConfig.imageObjectBuilder ?? envFlag("SCHEMA_IMAGE_OBJECT_BUILDER", true),
    productBuilder: fromConfig.productBuilder ?? envFlag("SCHEMA_PRODUCT_BUILDER", true),
    articleBuilder: fromConfig.articleBuilder ?? envFlag("SCHEMA_ARTICLE_BUILDER", true),
    videoObjectBuilder:
      fromConfig.videoObjectBuilder ?? envFlag("SCHEMA_VIDEO_OBJECT_BUILDER", true),
    reviewBuilder: fromConfig.reviewBuilder ?? envFlag("SCHEMA_REVIEW_BUILDER", true),
  };
}

export function isBuilderEnabled(
  builderId: string,
  flags: SchemaBuilderFlags,
): boolean {
  if (!flags.schemaPipeline) return false;
  const map: Record<string, keyof SchemaBuilderFlags> = {
    organization: "organizationBuilder",
    "local-business": "localBusinessBuilder",
    website: "websiteBuilder",
    webpage: "webPageBuilder",
    breadcrumb: "breadcrumbBuilder",
    faq: "faqBuilder",
    image: "imageObjectBuilder",
    product: "productBuilder",
    article: "articleBuilder",
    video: "videoObjectBuilder",
    review: "reviewBuilder",
  };
  const flagKey = map[builderId];
  if (!flagKey) return true;
  return flags[flagKey];
}
