import { z } from "zod";
import { FOOTER_SECTION_TYPES } from "@/features/footer/sections/types";
import { defaultResponsive } from "@/features/footer/defaults";

const footerLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  openInNewTab: z.boolean().optional(),
});

const footerColumnSchema = z.object({
  id: z.string(),
  type: z.enum(FOOTER_SECTION_TYPES),
  enabled: z.boolean().optional(),
  title: z.string().optional(),
  menuSource: z.enum(["custom", "header", "footer", "category", "collection"]).optional(),
  headerMenuKey: z.string().optional(),
  links: z.array(footerLinkSchema).optional(),
  body: z.string().optional(),
  showSocial: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  columnSlot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  hiddenOnTablet: z.boolean().optional(),
  hiddenOnMobile: z.boolean().optional(),
  socialSource: z.enum(["company", "custom"]).optional(),
  socialStyle: z.enum(["icons", "text", "icons-text"]).optional(),
  socialIconSize: z.enum(["sm", "md", "lg"]).optional(),
  socialLayout: z.enum(["horizontal", "vertical"]).optional(),
});

const footerDesignSchema = z.object({
  linkStyle: z.enum(["default", "muted", "underline"]).optional(),
  headingStyle: z.enum(["uppercase", "normal"]).optional(),
  columnGap: z.enum(["tight", "normal", "loose"]).optional(),
  borderStyle: z.enum(["subtle", "accent", "none"]).optional(),
  background: z.enum(["light", "dark", "accent", "inherit"]).optional(),
  textTone: z.enum(["light", "dark", "muted"]).optional(),
  padding: z.enum(["small", "medium", "large"]).optional(),
  divider: z.enum(["none", "top", "full"]).optional(),
  containerWidth: z.enum(["default", "narrow", "full"]).optional(),
  alignment: z.enum(["start", "center", "end"]).optional(),
});

export const footerWorkspaceSchema = z.object({
  version: z.literal(2),
  layout: z.enum(["grid", "centered"]).default("grid"),
  gridColumns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  responsive: z
    .object({
      desktop: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      tablet: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      mobile: z.literal(1),
    })
    .optional(),
  design: footerDesignSchema.optional().default({}),
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
}).transform((ws) => {
  const desktop =
    ws.responsive?.desktop === 2 || ws.responsive?.desktop === 4
      ? ws.responsive.desktop
      : ws.gridColumns === 2 || ws.gridColumns === 4
        ? ws.gridColumns
        : 3;
  return {
    ...ws,
    version: 2 as const,
    gridColumns: desktop,
    responsive: ws.responsive ?? defaultResponsive(desktop),
  };
});
