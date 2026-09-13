/**
 * UI metadata overlay for all 85 Prisma models.
 *
 * This is merged with the auto-generated prisma-metadata.json at runtime to
 * produce the Schema Explorer view. Keep this in sync with schema.prisma.
 * Each entry here is optional — models without overlay entries are still shown
 * in Schema Explorer, just without adminHref or note.
 */

import type { DataCategory } from "./types";

export interface PrismaModelOverlay {
  /** Matches `model <Name>` in schema.prisma exactly. */
  name: string;
  category: DataCategory;
  adminHref?: string;
  /** Deployment profile nav item id that gates this model's visibility. */
  deploymentNavItemId?: string;
  note: string;
}

export const PRISMA_MODEL_OVERLAYS: PrismaModelOverlay[] = [
  // core.prisma
  { name: "User", category: "system", adminHref: "/admin/users", note: "Auth — edit via admin users only" },
  { name: "PasswordResetToken", category: "system", note: "Auth token — system managed" },
  { name: "UserFavorite", category: "system", note: "Visitor favorites — system managed" },
  { name: "Gallery", category: "content", adminHref: "/admin/gallery", deploymentNavItemId: "gallery", note: "Gallery — /admin/gallery" },
  { name: "GalleryMedia", category: "content", deploymentNavItemId: "gallery", note: "Gallery media items" },
  { name: "Testimonial", category: "content", adminHref: "/admin/testimonials", deploymentNavItemId: "testimonials", note: "Testimonials — /admin/testimonials" },
  { name: "TestimonialCollection", category: "content", deploymentNavItemId: "testimonials", note: "Testimonial collections" },
  { name: "TestimonialCollectionItem", category: "content", deploymentNavItemId: "testimonials", note: "Testimonial collection items" },
  { name: "Inquiry", category: "marketing", adminHref: "/admin/inquiries", deploymentNavItemId: "inquiries", note: "CRM — /admin/inquiries" },
  { name: "Booking", category: "marketing", note: "FK to user + content item" },
  { name: "FaqSet", category: "content", adminHref: "/admin/faqs", deploymentNavItemId: "faqs", note: "FAQ sets — /admin/faqs" },
  { name: "FaqItem", category: "content", adminHref: "/admin/faqs", deploymentNavItemId: "faqs", note: "FAQ items — /admin/faqs" },
  { name: "CompanyInfo", category: "system", adminHref: "/admin/company", note: "Singleton settings row" },

  // entities.prisma
  { name: "ContentType", category: "catalog", adminHref: "/admin/content/types", deploymentNavItemId: "content-types", note: "Catalog types — /admin/content/types" },
  { name: "ContentCollection", category: "catalog", adminHref: "/admin/content", deploymentNavItemId: "collections", note: "Collections / categories" },
  { name: "ContentItem", category: "catalog", adminHref: "/admin/content", deploymentNavItemId: "content-types", note: "Catalog items — /admin/content" },
  { name: "ContentCollectionItem", category: "catalog", deploymentNavItemId: "collections", note: "Junction: collection ↔ item" },
  { name: "ContentItemMedia", category: "catalog", note: "Item media attachments" },
  { name: "ContentItemRevision", category: "catalog", note: "Content item version history" },

  // forms.prisma
  { name: "FormTemplate", category: "marketing", adminHref: "/admin/forms", deploymentNavItemId: "form-templates", note: "Conversion forms — /admin/forms" },
  { name: "FormSubmission", category: "marketing", adminHref: "/admin/form-submissions", deploymentNavItemId: "form-submissions", note: "Form inbox — /admin/form-submissions" },
  { name: "FormDraft", category: "marketing", note: "Autosaved form drafts" },
  { name: "NewsletterSubscriber", category: "marketing", adminHref: "/admin/newsletter", deploymentNavItemId: "newsletter", note: "Newsletter — /admin/newsletter" },
  { name: "DownloadGateUnlock", category: "marketing", note: "Gated download access" },
  { name: "FormWebhookDelivery", category: "marketing", note: "Webhook delivery log" },

  // i18n.prisma
  { name: "EntityTranslation", category: "i18n", adminHref: "/admin/translations", deploymentNavItemId: "translations", note: "Translated field values" },
  { name: "EntityTranslationVersion", category: "i18n", deploymentNavItemId: "translations", note: "Translation version history" },
  { name: "LocalizedSlug", category: "i18n", deploymentNavItemId: "translations", note: "Per-locale URL slugs" },
  { name: "TranslationJob", category: "i18n", deploymentNavItemId: "translations", note: "AI translation jobs" },
  { name: "TranslationMemory", category: "i18n", deploymentNavItemId: "translations", note: "Translation memory / TM" },

  // platform.prisma
  { name: "SiteTheme", category: "system", adminHref: "/admin/theme", note: "Theme SQL — /admin/theme" },
  { name: "JsonStore", category: "system", note: "Hybrid JSON engine" },
  { name: "MediaFolder", category: "system", adminHref: "/admin/media", deploymentNavItemId: "media-library", note: "Media folder tree" },
  { name: "MediaAsset", category: "system", adminHref: "/admin/media", deploymentNavItemId: "media-library", note: "Media library" },
  { name: "MediaUsage", category: "system", note: "Media reference tracking" },
  { name: "CmsPage", category: "content", adminHref: "/admin/pages", deploymentNavItemId: "pages", note: "CMS — blocks in DB JSON column" },
  { name: "CmsPageRevision", category: "content", deploymentNavItemId: "pages", note: "CMS page revision history" },
  { name: "PostCategory", category: "content", deploymentNavItemId: "blog", note: "Blog categories" },
  { name: "PostTag", category: "content", deploymentNavItemId: "blog", note: "Blog tags" },
  { name: "PostAuthor", category: "content", deploymentNavItemId: "blog", note: "Blog authors" },
  { name: "Post", category: "content", adminHref: "/admin/posts", deploymentNavItemId: "blog", note: "Blog — /admin/posts" },
  { name: "PostCategoryOnPost", category: "content", deploymentNavItemId: "blog", note: "Junction: post ↔ category" },
  { name: "PostTagOnPost", category: "content", deploymentNavItemId: "blog", note: "Junction: post ↔ tag" },
  { name: "Product", category: "catalog", adminHref: "/admin/products", deploymentNavItemId: "products", note: "Catalog products — /admin/products" },
  { name: "CatalogCollection", category: "catalog", deploymentNavItemId: "collections", note: "Catalog collections" },
  { name: "SiteSettings", category: "system", note: "Per-locale site config payload" },
  { name: "SearchAnalyticsSnapshot", category: "seo", note: "Per-locale search analytics" },
  { name: "SearchDocument", category: "system", note: "Search index" },
  { name: "SeoMeta", category: "seo", adminHref: "/admin/seo", deploymentNavItemId: "seo", note: "SEO — /admin/seo" },
  { name: "SeoChangeLog", category: "seo", deploymentNavItemId: "seo", note: "SEO change history" },
  { name: "SeoRedirect", category: "seo", deploymentNavItemId: "seo", note: "Redirects" },
  { name: "SeoSubmissionJob", category: "seo", deploymentNavItemId: "seo", note: "Sitemap submission jobs" },
  { name: "SeoRunnerLock", category: "seo", note: "SEO runner distributed lock" },
  { name: "SeoProviderTelemetry", category: "seo", deploymentNavItemId: "seo", note: "SEO provider telemetry" },
  { name: "SeoHealthSnapshot", category: "seo", deploymentNavItemId: "seo", note: "SEO health scores" },
  { name: "SeoCrawlIssue", category: "seo", deploymentNavItemId: "seo", note: "SEO crawl issue log" },
  { name: "SeoSearchMetric", category: "seo", deploymentNavItemId: "seo", note: "Search Console metrics" },
  { name: "SeoRichResultIssue", category: "seo", note: "Rich result validation issues" },
  { name: "Custom404", category: "content", adminHref: "/admin/seo", note: "Custom 404 pages" },
  { name: "LocaleConfig", category: "i18n", adminHref: "/admin/languages", deploymentNavItemId: "languages", note: "Locale configuration" },

  // portal.prisma
  { name: "PricingPlanSet", category: "portal", adminHref: "/admin/pricing-plans", deploymentNavItemId: "pricing-plans", note: "Pricing plan sets" },
  { name: "PricingPlan", category: "portal", adminHref: "/admin/pricing-plans", deploymentNavItemId: "pricing-plans", note: "Pricing plans" },
  { name: "PricingPlanFeature", category: "portal", deploymentNavItemId: "pricing-plans", note: "Plan feature lines" },
  { name: "ReleaseSet", category: "portal", adminHref: "/admin/releases", deploymentNavItemId: "releases", note: "Release sets" },
  { name: "Release", category: "portal", adminHref: "/admin/releases", deploymentNavItemId: "releases", note: "Changelog releases" },
  { name: "ReleaseEntry", category: "portal", deploymentNavItemId: "releases", note: "Release entries" },
  { name: "PricingCalculator", category: "portal", adminHref: "/admin/pricing-calculators", deploymentNavItemId: "pricing-calculators", note: "Pricing calculators" },
  { name: "PricingCalculatorField", category: "portal", deploymentNavItemId: "pricing-calculators", note: "Calculator fields" },
  { name: "PricingCalculatorRule", category: "portal", deploymentNavItemId: "pricing-calculators", note: "Calculator rules" },
  { name: "KnowledgeBase", category: "portal", adminHref: "/admin/knowledge-base", deploymentNavItemId: "knowledge-base", note: "Knowledge bases" },
  { name: "KnowledgeCategory", category: "portal", deploymentNavItemId: "knowledge-base", note: "KB categories" },
  { name: "KnowledgeArticle", category: "portal", deploymentNavItemId: "knowledge-base", note: "KB articles" },
  { name: "DocPortal", category: "portal", note: "Documentation portal" },
  { name: "DocVersion", category: "portal", note: "Doc version" },
  { name: "DocSection", category: "portal", note: "Doc section" },
  { name: "StatusBoard", category: "portal", note: "Status board" },
  { name: "StatusService", category: "portal", note: "Status service" },
  { name: "StatusIncident", category: "portal", note: "Status incident" },
  { name: "StatusMaintenance", category: "portal", note: "Status maintenance" },
  { name: "TeamDirectory", category: "portal", adminHref: "/admin/team", deploymentNavItemId: "team", note: "Team directory" },
  { name: "TeamDepartment", category: "portal", deploymentNavItemId: "team", note: "Team departments" },
  { name: "TeamMember", category: "portal", adminHref: "/admin/team", deploymentNavItemId: "team", note: "Team members — /admin/team" },
  { name: "PartnerProgram", category: "portal", adminHref: "/admin/partners", deploymentNavItemId: "partners", note: "Partner programs" },
  { name: "PartnerCategory", category: "portal", deploymentNavItemId: "partners", note: "Partner categories" },
  { name: "Partner", category: "portal", adminHref: "/admin/partners", deploymentNavItemId: "partners", note: "Partners — /admin/partners" },
];

const overlayMap = new Map(PRISMA_MODEL_OVERLAYS.map((o) => [o.name, o]));

export function getPrismaModelOverlay(modelName: string): PrismaModelOverlay | undefined {
  return overlayMap.get(modelName);
}
