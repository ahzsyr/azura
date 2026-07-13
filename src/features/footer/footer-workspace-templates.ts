import type { FooterSectionType } from "./sections/types";
import { getServerPlugin } from "./sections/registry.server";
import { createDefaultFooterWorkspace } from "./defaults";
import type { FooterWorkspace } from "./types";

export type FooterTemplateSectionSpec = {
  type: FooterSectionType;
  overrides?: Partial<import("./types").FooterColumn>;
};

export type FooterWorkspaceTemplate = {
  id: string;
  label: string;
  description: string;
  sections: FooterTemplateSectionSpec[];
  copyright?: FooterWorkspace["copyright"];
  layout?: FooterWorkspace["layout"];
};

export const FOOTER_WORKSPACE_TEMPLATES: FooterWorkspaceTemplate[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Brand and legal links only.",
    sections: [{ type: "brand" }, { type: "legal" }],
  },
  {
    id: "corporate",
    label: "Corporate",
    description: "Brand, navigation, contact, and legal.",
    sections: [
      { type: "brand" },
      { type: "menu", overrides: { title: "Quick links" } },
      { type: "contact" },
      { type: "legal", overrides: { title: "Legal" } },
    ],
    copyright: {
      showBar: true,
      legalLinks: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  },
  {
    id: "store",
    label: "Store",
    description: "E-commerce footer with collections and social.",
    sections: [
      { type: "brand" },
      { type: "menu", overrides: { title: "Shop", menuSource: "collection" } },
      { type: "contact" },
      { type: "social" },
      { type: "payments" },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Categories, trust signals, and legal.",
    sections: [
      { type: "brand" },
      { type: "menu", overrides: { title: "Categories", menuSource: "category" } },
      { type: "trust" },
      { type: "legal" },
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Hours, contact, and brand.",
    sections: [
      { type: "brand" },
      { type: "opening_hours" },
      { type: "contact" },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    description: "Brand, menu, text block, and social.",
    sections: [
      { type: "brand" },
      { type: "menu" },
      { type: "text", overrides: { title: "About us", body: "We help brands grow." } },
      { type: "social" },
    ],
  },
];

export function buildFooterWorkspaceFromTemplate(template: FooterWorkspaceTemplate): FooterWorkspace {
  const base = createDefaultFooterWorkspace();

  const columns = template.sections.map((spec) => {
    const plugin = getServerPlugin(spec.type);
    if (!plugin) throw new Error(`Unknown section type: ${spec.type}`);
    return plugin.createDefault(spec.overrides);
  });

  return {
    ...base,
    layout: template.layout ?? base.layout,
    columns,
    copyright: { ...base.copyright, ...template.copyright },
  };
}
