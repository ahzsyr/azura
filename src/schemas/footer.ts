import { z } from "zod";

const footerLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  openInNewTab: z.boolean().optional(),
});

const footerColumnSchema = z.object({
  id: z.string(),
  type: z.enum(["brand", "menu", "contact", "social", "text", "legal"]),
  enabled: z.boolean().optional(),
  title: z.string().optional(),
  menuSource: z.enum(["custom", "header"]).optional(),
  headerMenuKey: z.string().optional(),
  links: z.array(footerLinkSchema).optional(),
  body: z.string().optional(),
  showSocial: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showAddress: z.boolean().optional(),
});

export const footerWorkspaceSchema = z.object({
  version: z.literal(1),
  layout: z.enum(["grid", "centered"]).default("grid"),
  gridColumns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  design: z
    .object({
      linkStyle: z.enum(["default", "muted", "underline"]).optional(),
      headingStyle: z.enum(["uppercase", "normal"]).optional(),
      columnGap: z.enum(["tight", "normal", "loose"]).optional(),
      borderStyle: z.enum(["subtle", "accent", "none"]).optional(),
    })
    .optional()
    .default({}),
  columns: z.array(footerColumnSchema).default([]),
  copyright: z
    .object({
      showBar: z.boolean().optional(),
      rightsText: z.string().optional(),
      suffix: z.string().optional(),
      legalLinks: z.array(footerLinkSchema).optional(),
    })
    .optional()
    .default({}),
});
