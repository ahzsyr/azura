import { z } from "zod";

export const maxWidthSchema = z.enum(["full", "contained", "narrow", "reading"]);

export const advancedRichTextPropsSchema = z.object({
  content: z.string().default(""),
  html: z.string().default(""),
  maxWidth: maxWidthSchema.default("reading"),
  prose: z.boolean().default(true),
});

export const markdownPropsSchema = z.object({
  markdown: z.string().default(""),
  prose: z.boolean().default(true),
  allowGfm: z.boolean().default(true),
});

export const codePropsSchema = z.object({
  code: z.string().default(""),
  language: z.string().default("typescript"),
  title: z.string().default(""),
  showLineNumbers: z.boolean().default(true),
  showCopyButton: z.boolean().default(true),
  highlightLines: z.array(z.coerce.number()).default([]),
});

export const tableColumnSchema = z
  .object({
    id: z.string(),
    label: z.string().default(""),
    sortable: z.boolean().default(true),
  })
  .passthrough();

export const tableRowSchema = z.object({
  id: z.string(),
  cells: z.record(z.string()).default({}),
});

export const tableFeaturesSchema = z.object({
  sortable: z.boolean().default(true),
  filterable: z.boolean().default(false),
  searchable: z.boolean().default(true),
  paginated: z.boolean().default(false),
  pageSize: z.coerce.number().default(10),
});

export const tablePropsSchema = z.object({
  title: z.string().default(""),
  columns: z.array(tableColumnSchema).default([]),
  rows: z.array(tableRowSchema).default([]),
  features: tableFeaturesSchema.default({}),
  striped: z.boolean().default(true),
  compact: z.boolean().default(false),
});

export const timelineItemSchema = z
  .object({
    id: z.string(),
    date: z.string().default(""),
    title: z.string().default(""),
    description: z.string().default(""),
    icon: z.string().default(""),
    imageUrl: z.string().default(""),
    category: z.string().default(""),
  })
  .passthrough();

export const timelineLayoutSchema = z.enum(["vertical", "horizontal", "alternating"]);

export const timelinePropsSchema = z.object({
  title: z.string().default(""),
  layout: timelineLayoutSchema.default("vertical"),
  items: z.array(timelineItemSchema).default([]),
});

export const changelogEntrySchema = z.object({
  id: z.string(),
  text: z.string().default(""),
});

export const changelogSectionsSchema = z.object({
  features: z.array(changelogEntrySchema).default([]),
  improvements: z.array(changelogEntrySchema).default([]),
  fixes: z.array(changelogEntrySchema).default([]),
  breaking: z.array(changelogEntrySchema).default([]),
});

export const changelogReleaseSchema = z.object({
  id: z.string(),
  version: z.string().default(""),
  date: z.string().default(""),
  status: z.enum(["released", "beta", "deprecated"]).default("released"),
  tags: z.array(z.string()).default([]),
  sections: changelogSectionsSchema.default({}),
});

export const changelogLayoutSchema = z.enum(["timeline", "list"]);
export const changelogReleaseStatusFilterSchema = z.enum(["released", "beta", "deprecated"]);

export const changelogPropsSchema = z.object({
  title: z.string().default(""),
  releaseSetSlug: z.string().default(""),
  layout: changelogLayoutSchema.default("timeline"),
  filterTags: z.array(z.string()).default([]),
  filterStatuses: z.array(changelogReleaseStatusFilterSchema).default([]),
  releases: z.array(changelogReleaseSchema).default([]),
});

export const comparisonColumnSchema = z
  .object({
    id: z.string(),
    label: z.string().default(""),
    highlighted: z.boolean().default(false),
  })
  .passthrough();

export const comparisonRowSchema = z
  .object({
    id: z.string(),
    label: z.string().default(""),
    values: z.record(z.union([z.string(), z.boolean()])).default({}),
  })
  .passthrough();

export const comparisonSourceSchema = z.enum(["manual", "contentType", "catalog"]);
export const comparisonLayoutSchema = z.enum(["table", "cards", "sideBySide"]);

export const comparisonPropsSchema = z.object({
  title: z.string().default(""),
  source: comparisonSourceSchema.default("manual"),
  layout: comparisonLayoutSchema.default("table"),
  highlightDifferences: z.boolean().default(true),
  columns: z.array(comparisonColumnSchema).default([]),
  rows: z.array(comparisonRowSchema).default([]),
  contentTypeSlug: z.string().default(""),
  itemIds: z.array(z.string()).default([]),
  catalogSource: z.enum(["packages", "hotels", "services"]).default("packages"),
  attributeKeys: z.array(z.string()).default([]),
});

export function newId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
