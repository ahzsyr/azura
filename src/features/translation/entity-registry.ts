import type { TranslatableEntityType } from "./types";

export type EntityFieldDef = {
  field: string;
  label: string;
  type: "text" | "textarea" | "richtext" | "slug" | "stringList";
  required?: boolean;
  /** High-priority fields surface in the translation priority queue */
  priority?: boolean;
};

export type EntityTypeConfig = {
  label: string;
  fields: EntityFieldDef[];
  /** Legacy column suffix fields still on the model (En/Ar etc.) */
  legacyFields?: string[];
  slugField?: string;
};

/**
 * Central registry of translatable entity types and their fields.
 * New entity types only need an entry here — no schema column additions per language.
 *
 * Hybrid write/read rules: see hybrid-sync.ts (EntityTranslation + legacy En/Ar columns).
 */
export const ENTITY_REGISTRY: Record<TranslatableEntityType, EntityTypeConfig> = {
  ContentItem: {
    label: "Catalog Item",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "description", label: "Description", type: "richtext" },
      { field: "shortDescription", label: "Short description", type: "textarea" },
      { field: "features", label: "Features", type: "stringList" },
      { field: "seoTitle", label: "SEO title", type: "text" },
      { field: "seoDescription", label: "SEO description", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt", "description"],
    slugField: "slug",
  },
  ContentCollection: {
    label: "Collection",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
    ],
    legacyFields: ["name", "excerpt"],
    slugField: "slug",
  },
  ContentType: {
    label: "Content Type",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "description", label: "Description", type: "textarea" },
      { field: "pluralName", label: "Plural name", type: "text" },
    ],
    legacyFields: ["name", "labelSingular", "labelPlural"],
  },
  CmsPage: {
    label: "CMS Page",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
      { field: "content", label: "Content", type: "richtext" },
      { field: "seoTitle", label: "SEO title", type: "text" },
      { field: "seoDescription", label: "SEO description", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt"],
    slugField: "slug",
  },
  Post: {
    label: "Blog Post",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
      { field: "content", label: "Content", type: "richtext" },
      { field: "seoTitle", label: "SEO title", type: "text" },
      { field: "seoDescription", label: "SEO description", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt", "content"],
    slugField: "slug",
  },
  PostCategory: {
    label: "Post Category",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    legacyFields: ["name", "description"],
  },
  PostTag: {
    label: "Post Tag",
    fields: [{ field: "name", label: "Name", type: "text", required: true }],
    legacyFields: ["name"],
  },
  PostAuthor: {
    label: "Post Author",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "bio", label: "Bio", type: "textarea" },
    ],
    legacyFields: ["name", "bio"],
  },
  Gallery: {
    label: "Gallery",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
      { field: "description", label: "Description", type: "richtext" },
      { field: "info", label: "Info", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt", "description", "info"],
    slugField: "slug",
  },
  GalleryMedia: {
    label: "Gallery Media",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
      { field: "description", label: "Description", type: "richtext" },
      { field: "info", label: "Info", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt", "description", "info"],
  },
  Testimonial: {
    label: "Testimonial",
    fields: [
      { field: "authorName", label: "Author name", type: "text", required: true },
      { field: "role", label: "Role", type: "text" },
      { field: "company", label: "Company", type: "text" },
      { field: "quote", label: "Quote", type: "textarea", required: true },
    ],
    legacyFields: ["content"],
  },
  TestimonialCollection: {
    label: "Testimonial Collection",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt"],
    slugField: "slug",
  },
  FaqSet: {
    label: "FAQ Set",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    legacyFields: ["title", "excerpt", "description"],
  },
  FaqItem: {
    label: "FAQ Item",
    fields: [
      { field: "question", label: "Question", type: "text", required: true, priority: true },
      { field: "answer", label: "Answer", type: "richtext", required: true },
    ],
    legacyFields: ["question", "answer"],
  },
  CompanyInfo: {
    label: "Company Info",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "tagline", label: "Tagline", type: "text" },
      { field: "story", label: "Story", type: "richtext" },
      { field: "mission", label: "Mission", type: "richtext" },
      { field: "address", label: "Address", type: "textarea" },
    ],
    legacyFields: ["tagline", "story", "mission", "address"],
  },
  SeoMeta: {
    label: "SEO Meta",
    fields: [
      { field: "metaTitle", label: "Meta Title", type: "text" },
      { field: "metaDescription", label: "Meta Description", type: "textarea" },
      { field: "ogTitle", label: "OG Title", type: "text" },
      { field: "ogDescription", label: "OG Description", type: "textarea" },
      { field: "focusKeywords", label: "Focus Keywords", type: "text" },
    ],
    legacyFields: ["title", "description", "ogTitle"],
  },
  SeoSettings: {
    label: "SEO Settings",
    fields: [
      { field: "siteTitle", label: "Site Title", type: "text" },
      { field: "siteDescription", label: "Site Description", type: "textarea" },
    ],
    legacyFields: ["siteTitle", "siteDescription"],
  },
  Custom404: {
    label: "404 Page",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "body", label: "Body", type: "richtext" },
    ],
    legacyFields: ["title", "body"],
  },
  MediaAsset: {
    label: "Media Asset",
    fields: [{ field: "alt", label: "Alt Text", type: "text" }],
    legacyFields: ["alt"],
  },
  ContentItemMedia: {
    label: "Content Media",
    fields: [
      { field: "alt", label: "Alt Text", type: "text" },
      { field: "caption", label: "Caption", type: "textarea" },
    ],
    legacyFields: ["alt", "caption"],
  },
  Navigation: {
    label: "Navigation",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  MenuItem: {
    label: "Menu Item",
    fields: [
      { field: "label", label: "Label", type: "text", required: true },
      { field: "cardSubtitle", label: "Card subtitle", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  Footer: {
    label: "Footer",
    fields: [
      { field: "copyrightText", label: "Copyright", type: "text" },
      { field: "tagline", label: "Tagline", type: "text" },
    ],
  },
  FooterColumn: {
    label: "Footer Column",
    fields: [{ field: "heading", label: "Heading", type: "text", required: true }],
  },
  FooterLink: {
    label: "Footer Link",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  SiteIdentity: {
    label: "Site Identity",
    fields: [
      { field: "siteTagline", label: "Site tagline", type: "text" },
      { field: "siteDescription", label: "Site description", type: "textarea" },
      { field: "heroCallToAction", label: "Hero call to action", type: "text" },
    ],
  },
  EmailTemplate: {
    label: "Email Template",
    fields: [
      { field: "subject", label: "Subject", type: "text", required: true },
      { field: "body", label: "Body", type: "richtext", required: true },
    ],
  },
  BuilderBlock: {
    label: "Page block",
    fields: [
      { field: "title", label: "Title", type: "text", priority: true },
      { field: "subtitle", label: "Subtitle", type: "textarea", priority: true },
      { field: "content", label: "Content", type: "textarea" },
      { field: "ctaLabel", label: "CTA label", type: "text" },
      { field: "button", label: "Button", type: "text" },
      { field: "caption", label: "Caption", type: "textarea" },
      { field: "html", label: "HTML", type: "richtext" },
      { field: "alt", label: "Alt text", type: "text" },
      { field: "emptyMessage", label: "Empty message", type: "textarea" },
    ],
  },
};

export function getEntityConfig(entityType: string): EntityTypeConfig | undefined {
  return ENTITY_REGISTRY[entityType as TranslatableEntityType];
}

export function getTranslatableFields(entityType: string): EntityFieldDef[] {
  return getEntityConfig(entityType)?.fields ?? [];
}

export function getPriorityFields(entityType: string): EntityFieldDef[] {
  return getTranslatableFields(entityType).filter((f) => f.priority);
}

export function listRegisteredEntityTypes(): { type: TranslatableEntityType; label: string }[] {
  return (Object.entries(ENTITY_REGISTRY) as [TranslatableEntityType, EntityTypeConfig][]).map(
    ([type, config]) => ({ type, label: config.label })
  );
}

export function listPriorityFieldKeys(): { entityType: TranslatableEntityType; field: string }[] {
  const result: { entityType: TranslatableEntityType; field: string }[] = [];
  for (const [entityType, config] of Object.entries(ENTITY_REGISTRY) as [
    TranslatableEntityType,
    EntityTypeConfig,
  ][]) {
    for (const fieldDef of config.fields) {
      if (fieldDef.priority) {
        result.push({ entityType, field: fieldDef.field });
      }
    }
  }
  return result;
}
