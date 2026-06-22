/** JSON namespaces — low-priority / config / cache (not relational entities). */
export const JSON_NAMESPACES = {
  "block-presets": {
    label: "Block presets",
    description: "Reusable builder block presets",
    category: "builder",
  },
  "block-templates": {
    label: "Block templates",
    description: "Full page block templates",
    category: "builder",
  },
  "page-cache": {
    label: "Page cache",
    description: "Cached published CMS page payloads",
    category: "cache",
  },
  "theme-presets": {
    label: "Theme presets",
    description: "Theme preset tokens (draft copies)",
    category: "theme",
  },
  "catalog-display-defaults": {
    label: "Catalog display defaults",
    description: "Default card display settings for catalog blocks",
    category: "settings",
  },
  "catalog-collections": {
    label: "Catalog collections",
    description: "Product catalog collections overlay (serverless / read-only FS)",
    category: "settings",
  },
  "catalog-products": {
    label: "Catalog products overlay",
    description: "Product JSON overlay for serverless / read-only filesystem deployments",
    category: "settings",
  },
  "catalog-media": {
    label: "Catalog media overlay",
    description: "Site media metadata and tombstones for serverless deployments",
    category: "settings",
  },
  "catalog-collections-sync-report": {
    label: "Catalog collections sync report",
    description: "Last collection sync report for admin product counts",
    category: "settings",
  },
  settings: {
    label: "App settings",
    description: "Low-priority site settings key-value store",
    category: "settings",
  },
  "site-settings": {
    label: "Site settings overlay",
    description: "Vercel/serverless patches merged over bundled site.json",
    category: "settings",
  },
  "seo-global": {
    label: "SEO global",
    description: "Robots.txt and global SEO config",
    category: "seo",
  },
  "seo-structured": {
    label: "SEO structured data",
    description: "Global JSON-LD schemas",
    category: "seo",
  },
  "header-workspace": {
    label: "Header workspace",
    description: "Header builder menus and branding",
    category: "navigation",
  },
  "footer-workspace": {
    label: "Footer workspace",
    description: "Footer builder columns and layout",
    category: "navigation",
  },
  personalization: {
    label: "Personalization",
    description: "Visitor preset panel settings",
    category: "theme",
  },
  whatsapp: {
    label: "WhatsApp",
    description: "Floating button and page button appearance settings",
    category: "settings",
  },
  account: {
    label: "Account",
    description: "Password reset email templates and visitor account settings",
    category: "settings",
  },
  "preview-tokens": {
    label: "Preview tokens",
    description: "CMS draft preview tokens",
    category: "cms",
  },
  "demo-profiles": {
    label: "Demo profiles",
    description: "Custom demo website profile bundles",
    category: "settings",
  },
  "search-analytics": {
    label: "Search analytics",
    description: "Aggregated search metrics snapshot (legacy JsonStore bridge)",
    category: "settings",
  },
  "search-index-jobs": {
    label: "Search index jobs",
    description: "Queued async search indexing jobs for CMS/content saves",
    category: "cache",
  },
} as const;

export type JsonNamespace = keyof typeof JSON_NAMESPACES;

export const ALLOWED_JSON_NAMESPACES = Object.keys(JSON_NAMESPACES) as JsonNamespace[];

/** Relational models safe for read-only browse in Database Manager. */
export const BROWSABLE_TABLES = {
  FaqItem: {
    label: "FAQ items",
    prismaModel: "faqItem" as const,
    adminHref: "/admin/faqs",
  },
  FaqSet: {
    label: "FAQ sets",
    prismaModel: "faqSet" as const,
    adminHref: "/admin/faqs",
  },
  Testimonial: {
    label: "Testimonials",
    prismaModel: "testimonial" as const,
    adminHref: "/admin/testimonials",
  },
  Gallery: {
    label: "Gallery",
    prismaModel: "gallery" as const,
    adminHref: "/admin/gallery",
  },
  ContentItem: {
    label: "Content items",
    prismaModel: "contentItem" as const,
    adminHref: "/admin/content",
  },
  ContentType: {
    label: "Content types",
    prismaModel: "contentType" as const,
    adminHref: "/admin/content/types",
  },
  ContentCollection: {
    label: "Content collections",
    prismaModel: "contentCollection" as const,
    adminHref: "/admin/content",
  },
} as const;

export type BrowsableTableKey = keyof typeof BROWSABLE_TABLES;

/** Prisma schema overview for inspector (static mirror of schema.prisma). */
export const SCHEMA_MODELS = [
  { name: "User", kind: "relational", note: "Auth — edit via admin users only" },
  { name: "ContentType", kind: "relational", note: "Catalog types — /admin/content/types" },
  { name: "ContentItem", kind: "relational", note: "Catalog items — /admin/content" },
  { name: "ContentCollection", kind: "relational", note: "Collections / categories" },
  { name: "Inquiry", kind: "relational", note: "CRM — /admin/inquiries" },
  { name: "FormTemplate", kind: "relational", note: "Conversion forms — /admin/forms" },
  { name: "FormSubmission", kind: "relational", note: "Form inbox — /admin/form-submissions" },
  { name: "NewsletterSubscriber", kind: "relational", note: "Newsletter — /admin/newsletter" },
  { name: "Booking", kind: "relational", note: "FK to user + content item" },
  { name: "CmsPage", kind: "relational", note: "CMS — blocks in DB JSON column" },
  { name: "Post", kind: "relational", note: "Blog — /admin/posts" },
  { name: "MediaAsset", kind: "relational", note: "Media library" },
  { name: "SiteTheme", kind: "relational", note: "Theme SQL — /admin/theme" },
  { name: "JsonStore", kind: "json", note: "Hybrid JSON engine" },
  { name: "SearchDocument", kind: "relational", note: "Search index" },
  { name: "SeoMeta", kind: "relational", note: "SEO — /admin/seo" },
  { name: "SeoRedirect", kind: "relational", note: "Redirects" },
  { name: "CompanyInfo", kind: "relational", note: "Singleton settings row" },
  { name: "SiteSettings", kind: "relational", note: "Per-locale site config payload" },
  { name: "SearchAnalyticsSnapshot", kind: "relational", note: "Per-locale search analytics" },
  { name: "Product", kind: "relational", note: "Catalog products — /admin/catalog-products" },
  { name: "CatalogCollection", kind: "relational", note: "Catalog collections" },
] as const;
