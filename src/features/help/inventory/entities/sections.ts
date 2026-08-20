import type { HelpInventorySection } from "@/features/help/inventory/types";

export const INVENTORY_SECTIONS: HelpInventorySection[] = [
  {
    id: "section-shared-seo",
    kind: "section",
    version: 1,
    label: "SEO",
    componentIds: ["component-seo-meta"],
  },
  {
    id: "section-shared-media",
    kind: "section",
    version: 1,
    label: "Media",
    componentIds: ["component-media-picker"],
  },
  {
    id: "section-seo-snapshot",
    kind: "section",
    version: 1,
    label: "SEO snapshot",
    description: "Score panel, issue counts, and quick links on SEO Overview.",
  },
  {
    id: "section-seo-routing-links",
    kind: "section",
    version: 1,
    label: "Routing system links",
    description: "Filterable route catalog used when creating redirects.",
  },
  {
    id: "section-seo-redirect-form",
    kind: "section",
    version: 1,
    label: "Add / edit redirect",
    fieldIds: ["field-redirect-from", "field-redirect-to", "field-redirect-type"],
    actionIds: ["action-add-redirect", "action-save"],
  },
  {
    id: "section-seo-redirect-rules",
    kind: "section",
    version: 1,
    label: "Redirect rules",
    description: "List of configured redirect rules with edit and delete.",
  },
  {
    id: "section-site-visibility",
    kind: "section",
    version: 1,
    label: "Public visibility",
    fieldIds: ["field-coming-soon-toggle"],
  },
  {
    id: "section-languages-locale-cards",
    kind: "section",
    version: 1,
    label: "Locale cards",
    fieldIds: ["field-locale-code", "field-locale-prefix", "field-locale-direction"],
  },
];
