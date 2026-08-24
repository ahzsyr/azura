import type { Locale } from "@/i18n/routing";
import type { PublicLocale } from "@/i18n/locale-config";
import type { CompanyInfoView } from "@/features/translation/admin-localized-view";
import type { SiteBrandContext } from "@/lib/load-site-brand-context";
import type { SeoStructuredConfig } from "@/features/seo/types";
import type { Product } from "@/features/products/types";

export type SchemaNode = Record<string, unknown>;

export type SchemaGraph = {
  "@context": "https://schema.org";
  "@graph": SchemaNode[];
};

export type ValidationLevel = "ERROR" | "WARNING" | "INFO";

export type ValidationIssue = {
  level: ValidationLevel;
  code: string;
  message: string;
};

export type PipelineResult = {
  graph: SchemaGraph;
  issues: ValidationIssue[];
};

export type PageType =
  | "static"
  | "cms"
  | "product"
  | "faq"
  | "blog"
  | "collection"
  | "unknown";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export type FaqSchemaItem = {
  question: string;
  answer: string;
};

export type BusinessPhotoRole = "office" | "warehouse" | "storefront" | "product";

export type BusinessPhotoAsset = {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  role: BusinessPhotoRole;
};

export type ArticleSchemaInput = {
  headline: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  imageUrl?: string;
};

export type SiteContext = {
  company: CompanyInfoView | null;
  brand: SiteBrandContext;
  logoUrl: string;
  locales: PublicLocale[];
  structuredConfig: SeoStructuredConfig;
  businessPhotos: BusinessPhotoAsset[];
};

export type PageContext = {
  pageType: PageType;
  path: string;
  pageKey?: string;
  title: string;
  description: string;
  faqItems: FaqSchemaItem[];
  breadcrumbItems: BreadcrumbItem[];
  product?: Product;
  article?: ArticleSchemaInput;
  reviews?: Array<{ name: string; rating: number; content: string }>;
  /** Resolved SeoMeta.jsonLd for the current page/locale. */
  pageJsonLd?: unknown;
  /** Whether SeoMeta.jsonLd exists in database (column or translation). */
  seoMetaJsonLdInDatabase?: boolean;
};

export type RuntimeContext = {
  locale: Locale;
  localePrefix: string;
  canonicalUrl: string;
  siteOrigin: string;
  environment: "production" | "preview" | "test";
};

export type SchemaContext = {
  site: SiteContext;
  page: PageContext;
  runtime: RuntimeContext;
};

export type SchemaBuilder = {
  id: string;
  version: number;
  supports(ctx: SchemaContext): boolean;
  build(ctx: SchemaContext): SchemaNode[];
};

export type DedupeRule = {
  id: string;
  apply(nodes: SchemaNode[]): SchemaNode[];
};

export type SchemaValidator = {
  id: string;
  validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[];
};
