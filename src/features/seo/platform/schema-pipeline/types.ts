import type { Locale } from "@/i18n/routing";
import type { PublicLocale } from "@/i18n/locale-config";
import type { CompanyInfoView } from "@/features/translation/admin-localized-view";
import type { SiteBrandContext } from "@/lib/load-site-brand-context";
import type { SeoStructuredConfig } from "@/features/seo/types";
import type { Product } from "@/features/products/types";
import type { SchemaDiagnostic } from "./graph/deep-merge";

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
  diagnostics?: import("./graph/deep-merge").SchemaDiagnostic[];
  provenance?: Record<string, Record<string, string>>;
  quarantinedNodes?: SchemaNode[];
};

export type PageType =
  | "static"
  | "cms"
  | "product"
  | "faq"
  | "blog"
  | "collection"
  | "brand"
  | "tag"
  | "search"
  | "package"
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
  /** Watch-page video (optional). Prefer real uploadDate; never invent one. */
  video?: {
    slug?: string;
    name?: string;
    description?: string;
    contentUrl: string;
    thumbnailUrl?: string;
    uploadDate?: string;
    duration?: string;
  };
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
  /** When true, WebSite includes SearchAction potentialAction. */
  publicSearchEnabled?: boolean;
};

export type SchemaContext = {
  site: SiteContext;
  page: PageContext;
  runtime: RuntimeContext;
};

export type GoogleBuilderStatus =
  | "supported"
  | "supporting"
  | "limited"
  | "deprecated"
  | "conditional"
  | "not-a-rich-result";

export type SchemaBuilderGoogleMeta = {
  feature: string;
  status: GoogleBuilderStatus;
  description: string;
  why?: string;
};

export type SchemaBuilder = {
  id: string;
  version: number;
  label?: string;
  google?: SchemaBuilderGoogleMeta;
  supports(ctx: SchemaContext): boolean;
  build(ctx: SchemaContext): SchemaNode[];
  provenance?: (ctx: SchemaContext, node: SchemaNode) => Record<string, string>;
  validate?: (nodes: SchemaNode[], ctx: SchemaContext) => SchemaDiagnostic[];
};

export type DedupeRule = {
  id: string;
  apply(nodes: SchemaNode[]): SchemaNode[];
};

export type SchemaValidator = {
  id: string;
  validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[];
};
