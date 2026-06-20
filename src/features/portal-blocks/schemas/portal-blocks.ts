import { z } from "zod";

export const localizedPortalTitleFields = {
  title: z.string().default(""),
  subtitle: z.string().default(""),
};

export const pricingCalculatorPropsSchema = z.object({
  ...localizedPortalTitleFields,
  pricingCalculatorSlug: z.string().default(""),
  showDescription: z.boolean().default(true),
  layout: z.enum(["stacked", "inline", "card"]).default("stacked"),
});

export const knowledgeBaseLayoutSchema = z.enum(["grid", "list", "sidebar"]);
export const knowledgeBasePropsSchema = z.object({
  ...localizedPortalTitleFields,
  knowledgeBaseSlug: z.string().default(""),
  layout: knowledgeBaseLayoutSchema.default("grid"),
  showSearch: z.boolean().default(true),
  showCategories: z.boolean().default(true),
  categorySlug: z.string().default(""),
  limit: z.coerce.number().default(0),
  showRatings: z.boolean().default(true),
});

export const documentationNavLayoutSchema = z.enum(["sidebar", "tree", "tabs"]);
export const documentationNavPropsSchema = z.object({
  ...localizedPortalTitleFields,
  docPortalSlug: z.string().default(""),
  versionSlug: z.string().default(""),
  layout: documentationNavLayoutSchema.default("sidebar"),
  showBreadcrumbs: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  showToc: z.boolean().default(true),
  rootSectionSlug: z.string().default(""),
});

export const statusDashboardLayoutSchema = z.enum(["compact", "full"]);
export const statusDashboardPropsSchema = z.object({
  ...localizedPortalTitleFields,
  statusBoardSlug: z.string().default(""),
  layout: statusDashboardLayoutSchema.default("full"),
  showUptime: z.boolean().default(true),
  showIncidents: z.boolean().default(true),
  showMaintenance: z.boolean().default(true),
  pollingIntervalMs: z.coerce.number().min(5000).max(300000).default(60000),
});

export const teamDirectoryLayoutSchema = z.enum(["grid", "list"]);
export const teamDirectoryPropsSchema = z.object({
  ...localizedPortalTitleFields,
  teamDirectorySlug: z.string().default(""),
  layout: teamDirectoryLayoutSchema.default("grid"),
  showSearch: z.boolean().default(true),
  showDepartments: z.boolean().default(true),
  departmentId: z.string().default(""),
  limit: z.coerce.number().default(0),
});

export const partnerDirectoryLayoutSchema = z.enum(["grid", "list", "map"]);
export const partnerDirectoryPropsSchema = z.object({
  ...localizedPortalTitleFields,
  partnerProgramSlug: z.string().default(""),
  layout: partnerDirectoryLayoutSchema.default("grid"),
  showSearch: z.boolean().default(true),
  categorySlug: z.string().default(""),
  locationFilter: z.string().default(""),
  limit: z.coerce.number().default(0),
  showMap: z.boolean().default(false),
});

export type PricingCalculatorProps = z.infer<typeof pricingCalculatorPropsSchema>;
export type KnowledgeBaseProps = z.infer<typeof knowledgeBasePropsSchema>;
export type DocumentationNavProps = z.infer<typeof documentationNavPropsSchema>;
export type StatusDashboardProps = z.infer<typeof statusDashboardPropsSchema>;
export type TeamDirectoryProps = z.infer<typeof teamDirectoryPropsSchema>;
export type PartnerDirectoryProps = z.infer<typeof partnerDirectoryPropsSchema>;
