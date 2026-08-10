import type { HelpInventoryComponent } from "@/features/help/inventory/types";

export const INVENTORY_COMPONENTS: HelpInventoryComponent[] = [
  {
    id: "component-seo-meta",
    kind: "component",
    version: 2,
    label: "SEO metadata form",
    description:
      "SeoMetaForm used on SEO Metadata static pages and the Pages editor SEO tab.",
    fieldIds: [
      "field-meta-title",
      "field-meta-description",
      "field-focus-keywords",
      "field-canonical-url",
      "field-robots",
      "field-og-title",
      "field-og-image",
      "field-twitter-card",
      "field-json-ld",
    ],
    actionIds: ["action-auto-fill-seo", "action-save"],
  },
  {
    id: "component-media-picker",
    kind: "component",
    version: 1,
    label: "Media picker",
    description: "Select or upload images and files from the Media Library.",
  },
  {
    id: "component-locale-fields",
    kind: "component",
    version: 1,
    label: "Localized fields",
    description: "Edit translated values using the admin locale switcher.",
  },
  {
    id: "component-admin-list",
    kind: "component",
    version: 1,
    label: "Admin list",
    description: "Card or row list used by CMS list screens (e.g. Pages).",
  },
];
