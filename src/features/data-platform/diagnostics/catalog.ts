import type { DiagnosticCategory, DiagnosticSeverity } from "./types";

export type DiagnosticCheckCatalogItem = {
  id: string;
  title: string;
  description: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  deploymentNavItemId?: string;
};

export const DIAGNOSTIC_CHECKS_CATALOG: DiagnosticCheckCatalogItem[] = [
  {
    id: "empty-faq-sets",
    title: "Empty FAQ sets",
    description: "FAQ sets that have no items attached. These sets will render empty on the frontend.",
    category: "integrity",
    severity: "warning",
    deploymentNavItemId: "faqs",
  },
  {
    id: "empty-galleries",
    title: "Empty galleries",
    description: "Published galleries with no media attached.",
    category: "integrity",
    severity: "warning",
    deploymentNavItemId: "gallery",
  },
  {
    id: "empty-collections",
    title: "Empty content collections",
    description: "Published content collections with no items assigned.",
    category: "integrity",
    severity: "info",
    deploymentNavItemId: "collections",
  },
  {
    id: "duplicate-content-slugs",
    title: "Duplicate content item slugs",
    description:
      "ContentItem records sharing the same slug within the same content type. Duplicates will cause routing conflicts.",
    category: "integrity",
    severity: "error",
    deploymentNavItemId: "content-types",
  },
  {
    id: "duplicate-page-slugs",
    title: "Duplicate CMS page slugs",
    description: "CmsPage records sharing the same slug. Will cause 404s or routing ambiguity.",
    category: "integrity",
    severity: "error",
    deploymentNavItemId: "pages",
  },
  {
    id: "content-status-breakdown",
    title: "Content item status breakdown",
    description: "Count of content items by status (DRAFT, SCHEDULED, ARCHIVED). Large numbers may indicate stale content.",
    category: "content",
    severity: "info",
    deploymentNavItemId: "content-types",
  },
  {
    id: "hidden-faq-items",
    title: "Hidden FAQ items",
    description: "FAQ items with isPublished=false. These are invisible on the frontend.",
    category: "content",
    severity: "info",
    deploymentNavItemId: "faqs",
  },
  {
    id: "stale-form-submissions",
    title: "Stale unread form submissions",
    description: "Form submissions with status NEW that are older than 7 days and have not been reviewed.",
    category: "content",
    severity: "warning",
    deploymentNavItemId: "form-submissions",
  },
  {
    id: "high-draft-ratio",
    title: "High content draft ratio",
    description:
      "More than 40% of all content items are in DRAFT status. Indicates content may not be properly reviewed and published.",
    category: "content",
    severity: "warning",
    deploymentNavItemId: "content-types",
  },
  {
    id: "testimonials-no-image",
    title: "Testimonials without image",
    description: "Published testimonials missing an imageUrl. These may render with a placeholder or look broken.",
    category: "media",
    severity: "warning",
    deploymentNavItemId: "testimonials",
  },
  {
    id: "galleries-no-cover",
    title: "Galleries without cover image",
    description: "Published galleries missing a coverUrl. The listing page may show a broken image.",
    category: "media",
    severity: "warning",
    deploymentNavItemId: "gallery",
  },
  {
    id: "empty-json-namespaces",
    title: "Empty JSON namespaces",
    description: "JSON store namespaces with zero records. May indicate un-initialized configuration.",
    category: "config",
    severity: "info",
  },
  {
    id: "json-store-size",
    title: "JSON store total size",
    description: "Total number of records in the JSON store. Useful as a baseline health indicator.",
    category: "config",
    severity: "info",
  },
];
