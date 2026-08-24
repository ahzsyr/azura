import type {
  ArticleSchemaInput,
  BreadcrumbItem,
  FaqSchemaItem,
  PageType,
} from "../types";
import type { Product } from "@/features/products/types";

export type SchemaPageOverrides = {
  pathname?: string;
  canonicalUrl?: string;
  pageType?: PageType;
  title?: string;
  description?: string;
  faqItems?: FaqSchemaItem[];
  breadcrumbItems?: BreadcrumbItem[];
  product?: Product;
  article?: ArticleSchemaInput;
  reviews?: Array<{ name: string; rating: number; content: string }>;
  pageJsonLd?: unknown;
  seoMetaJsonLdInDatabase?: boolean;
};
