import type { ContentFieldDefinition } from "@/features/content/types";
import { getContentItemTranslatableFields } from "./content-type-translation-registry";
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
  slugField?: string;
};

/**
 * Central registry of translatable entity types and their fields.
 * New entity types only need an entry here — no schema column additions per language.
 */
export const ENTITY_REGISTRY: Record<TranslatableEntityType, EntityTypeConfig> = {
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
  CatalogCollection: {
    label: "Catalog Collection",
    fields: [
      { field: "name", label: "Name", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
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
    slugField: "slug",
  },
  CompanyInfo: {
    label: "Company Info",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "tagline", label: "Tagline", type: "text" },
      { field: "story", label: "Story", type: "richtext" },
      { field: "mission", label: "Mission", type: "richtext" },
      { field: "vision", label: "Vision", type: "richtext" },
      { field: "values", label: "Values", type: "richtext" },
      { field: "address", label: "Address", type: "textarea" },
      { field: "officeHours", label: "Office hours", type: "textarea" },
    ],
  },
  ContentCollection: {
    label: "Collection",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
    ],
    slugField: "slug",
  },
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
    slugField: "slug",
  },
  ContentItemMedia: {
    label: "Content Media",
    fields: [
      { field: "alt", label: "Alt Text", type: "text" },
      { field: "caption", label: "Caption", type: "textarea" },
    ],
  },
  ContentType: {
    label: "Content Type",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "labelSingular", label: "Singular label", type: "text" },
      { field: "labelPlural", label: "Plural label", type: "text" },
    ],
  },
  Custom404: {
    label: "404 Page",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "body", label: "Body", type: "richtext" },
    ],
  },
  DocPortal: {
    label: "Doc Portal",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  DocSection: {
    label: "Doc Section",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "content", label: "Content", type: "richtext" },
    ],
    slugField: "slug",
  },
  DocVersion: {
    label: "Doc Version",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
    slugField: "slug",
  },
  EmailTemplate: {
    label: "Email Template",
    fields: [
      { field: "subject", label: "Subject", type: "text", required: true },
      { field: "body", label: "Body", type: "richtext", required: true },
    ],
  },
  FaqItem: {
    label: "FAQ Item",
    fields: [
      { field: "question", label: "Question", type: "text", required: true, priority: true },
      { field: "answer", label: "Answer", type: "richtext", required: true },
    ],
  },
  FaqSet: {
    label: "FAQ Set",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
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
    fields: [
      { field: "heading", label: "Heading", type: "text", required: true },
      { field: "body", label: "Body", type: "textarea" },
    ],
  },
  FooterLink: {
    label: "Footer Link",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  HeaderAction: {
    label: "Header Action",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  Gallery: {
    label: "Gallery",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
      { field: "description", label: "Description", type: "richtext" },
      { field: "info", label: "Info", type: "textarea" },
    ],
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
  },
  KnowledgeArticle: {
    label: "Knowledge Article",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
      { field: "body", label: "Body", type: "richtext" },
    ],
    slugField: "slug",
  },
  KnowledgeBase: {
    label: "Knowledge Base",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  KnowledgeCategory: {
    label: "Knowledge Category",
    fields: [{ field: "title", label: "Title", type: "text", required: true, priority: true }],
    slugField: "slug",
  },
  MediaAsset: {
    label: "Media Asset",
    fields: [
      { field: "alt", label: "Alt Text", type: "text", priority: true },
      { field: "caption", label: "Caption", type: "textarea" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  MegaMenuPanel: {
    label: "Mega Menu Panel",
    fields: [
      { field: "title", label: "Title", type: "text" },
      { field: "body", label: "Body", type: "textarea" },
    ],
  },
  MegaMenuTab: {
    label: "Mega Menu Tab",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  MenuItem: {
    label: "Menu Item",
    fields: [
      { field: "label", label: "Label", type: "text", required: true },
      { field: "cardSubtitle", label: "Card subtitle", type: "text" },
      { field: "badgeText", label: "Badge text", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  Navigation: {
    label: "Navigation",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  Partner: {
    label: "Partner",
    fields: [
      { field: "name", label: "Name", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
      { field: "location", label: "Location", type: "text" },
    ],
  },
  PartnerCategory: {
    label: "Partner Category",
    fields: [{ field: "name", label: "Name", type: "text", required: true }],
    slugField: "slug",
  },
  PartnerProgram: {
    label: "Partner Program",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  Post: {
    label: "Blog Post",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
      { field: "featuredImageAlt", label: "Featured image alt", type: "text" },
      { field: "featuredImageCaption", label: "Featured image caption", type: "textarea" },
      { field: "seoTitle", label: "SEO title", type: "text" },
      { field: "seoDescription", label: "SEO description", type: "textarea" },
    ],
    slugField: "slug",
  },
  PostAuthor: {
    label: "Post Author",
    fields: [
      { field: "name", label: "Name", type: "text", required: true },
      { field: "bio", label: "Bio", type: "textarea" },
    ],
  },
  PostCategory: {
    label: "Post Category",
    fields: [{ field: "name", label: "Name", type: "text", required: true }],
  },
  PostTag: {
    label: "Post Tag",
    fields: [{ field: "name", label: "Name", type: "text", required: true }],
  },
  PricingCalculator: {
    label: "Pricing Calculator",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  PricingCalculatorField: {
    label: "Pricing Calculator Field",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  PricingPlan: {
    label: "Pricing Plan",
    fields: [
      { field: "name", label: "Name", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
      { field: "badge", label: "Badge", type: "text" },
      { field: "ctaLabel", label: "CTA label", type: "text" },
    ],
  },
  PricingPlanFeature: {
    label: "Pricing Plan Feature",
    fields: [{ field: "label", label: "Label", type: "text", required: true }],
  },
  PricingPlanSet: {
    label: "Pricing Plan Set",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  Product: {
    label: "Product",
    fields: [
      { field: "productTitle", label: "Product title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "richtext" },
      { field: "shortDescription", label: "Short description", type: "textarea" },
      { field: "seoTitle", label: "SEO title", type: "text" },
      { field: "seoDescription", label: "SEO description", type: "textarea" },
    ],
    slugField: "canonicalSlug",
  },
  ReleaseEntry: {
    label: "Release Entry",
    fields: [{ field: "text", label: "Text", type: "textarea", required: true }],
  },
  ReleaseSet: {
    label: "Release Set",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  SeoMeta: {
    label: "SEO Meta",
    fields: [
      { field: "metaTitle", label: "Meta title", type: "text" },
      { field: "metaDescription", label: "Meta description", type: "textarea" },
      { field: "ogTitle", label: "OG title", type: "text" },
      { field: "ogDescription", label: "OG description", type: "textarea" },
    ],
  },
  SiteIdentity: {
    label: "Site Identity",
    fields: [
      { field: "siteTagline", label: "Site tagline", type: "text" },
      { field: "siteDescription", label: "Site description", type: "textarea" },
      { field: "heroCallToAction", label: "Hero call to action", type: "text" },
    ],
  },
  StatusBoard: {
    label: "Status Board",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  StatusIncident: {
    label: "Status Incident",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "message", label: "Message", type: "textarea" },
    ],
  },
  StatusMaintenance: {
    label: "Status Maintenance",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "message", label: "Message", type: "textarea" },
    ],
  },
  StatusService: {
    label: "Status Service",
    fields: [
      { field: "name", label: "Name", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  TeamDepartment: {
    label: "Team Department",
    fields: [{ field: "name", label: "Name", type: "text", required: true }],
  },
  TeamDirectory: {
    label: "Team Directory",
    fields: [
      { field: "title", label: "Title", type: "text", required: true, priority: true },
      { field: "description", label: "Description", type: "textarea" },
    ],
    slugField: "slug",
  },
  TeamMember: {
    label: "Team Member",
    fields: [
      { field: "name", label: "Name", type: "text", required: true, priority: true },
      { field: "role", label: "Role", type: "text" },
      { field: "bio", label: "Bio", type: "textarea" },
      { field: "location", label: "Location", type: "text" },
    ],
  },
  Testimonial: {
    label: "Testimonial",
    fields: [{ field: "quote", label: "Quote", type: "textarea", required: true, priority: true }],
  },
  TestimonialCollection: {
    label: "Testimonial Collection",
    fields: [
      { field: "title", label: "Title", type: "text", required: true },
      { field: "excerpt", label: "Excerpt", type: "textarea" },
    ],
    slugField: "slug",
  },
};

/** Maps AZURA preset IDs to legacy Prisma translation entityType strings. */
export const PRESET_ENTITY_ALIASES: Record<string, TranslatableEntityType[]> = {
  knowledge: ["KnowledgeArticle", "KnowledgeCategory", "KnowledgeBase"],
  "team-member": ["TeamMember", "TeamDepartment", "TeamDirectory"],
  partner: ["Partner", "PartnerCategory", "PartnerProgram"],
  pricing: ["PricingPlan", "PricingPlanFeature", "PricingPlanSet"],
};

export function getEntityTypesForPreset(presetId: string): TranslatableEntityType[] {
  return PRESET_ENTITY_ALIASES[presetId] ?? [];
}

export function getEntityConfigForPreset(presetId: string): EntityTypeConfig[] {
  return getEntityTypesForPreset(presetId)
    .map((entityType) => ENTITY_REGISTRY[entityType])
    .filter((config): config is EntityTypeConfig => Boolean(config));
}

export function getEntityConfig(entityType: string): EntityTypeConfig | undefined {
  return ENTITY_REGISTRY[entityType as TranslatableEntityType];
}

export function getTranslatableFields(
  entityType: string,
  options?: { fieldSchema?: ContentFieldDefinition[] },
): EntityFieldDef[] {
  if (entityType === "ContentItem" && options?.fieldSchema) {
    return getContentItemTranslatableFields(options.fieldSchema);
  }
  return getEntityConfig(entityType)?.fields ?? [];
}

export function getRequiredFields(
  entityType: string,
  options?: { fieldSchema?: ContentFieldDefinition[] },
): EntityFieldDef[] {
  return getTranslatableFields(entityType, options).filter((f) => f.required);
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
