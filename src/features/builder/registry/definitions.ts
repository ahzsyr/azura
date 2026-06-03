import type { BlockDefinition } from "@/types/block-system";
import { BLOCK_SYSTEM_VERSION } from "@/types/block-system";
import type { BlockType } from "@/types/builder";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import { BLOCK_TRANSLATABLE_FIELDS } from "@/features/translation/block-translation";

const BASE_META: Record<
  BlockType,
  Omit<BlockDefinition, "defaultSettings" | "translatableFields" | "componentKey">
> = {
  hero: {
    type: "hero",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Hero",
    description: "Full-width banner with title and CTA",
    icon: "layout",
  },
  section: {
    type: "section",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Section",
    description: "Group blocks in a container",
    icon: "box",
  },
  spacer: {
    type: "spacer",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Spacer",
    description: "Vertical spacing between blocks",
    icon: "move-vertical",
  },
  divider: {
    type: "divider",
    version: BLOCK_SYSTEM_VERSION,
    category: "layout",
    name: "Divider",
    description: "Horizontal line separator",
    icon: "minus",
  },
  text: {
    type: "text",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Text",
    description: "Simple text paragraph",
    icon: "type",
  },
  richText: {
    type: "richText",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Rich Text",
    description: "Formatted HTML content",
    icon: "file-text",
  },
  image: {
    type: "image",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Image",
    description: "Single image with optional caption",
    icon: "image",
  },
  gallery: {
    type: "gallery",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Gallery",
    description: "Grid from a linked gallery album",
    icon: "images",
  },
  video: {
    type: "video",
    version: BLOCK_SYSTEM_VERSION,
    category: "content",
    name: "Video",
    description: "Embedded video player",
    icon: "video",
  },
  cta: {
    type: "cta",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "CTA",
    description: "Call-to-action banner with button",
    icon: "megaphone",
  },
  testimonials: {
    type: "testimonials",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Testimonials",
    description: "Customer reviews carousel",
    icon: "star",
  },
  pricing: {
    type: "pricing",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Pricing",
    description: "Pricing table or cards",
    icon: "dollar-sign",
  },
  inquiryForm: {
    type: "inquiryForm",
    version: BLOCK_SYSTEM_VERSION,
    category: "marketing",
    name: "Inquiry Form",
    description: "Contact or visa inquiry form",
    icon: "mail",
  },
  catalog: {
    type: "catalog",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "Catalog",
    description: "Unified packages, hotels, or services grid",
    icon: "layout-grid",
  },
  contentList: {
    type: "contentList",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "Content List",
    description: "Generic content items from any collection or type",
    icon: "layers",
  },
  faq: {
    type: "faq",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "FAQ",
    description: "Frequently asked questions",
    icon: "help-circle",
  },
  customHtml: {
    type: "customHtml",
    version: BLOCK_SYSTEM_VERSION,
    category: "data",
    name: "Custom HTML",
    description: "Raw HTML for advanced layouts",
    icon: "code",
  },
};

function def(type: BlockType): BlockDefinition {
  return {
    ...BASE_META[type],
    defaultSettings: BLOCK_DEFAULTS[type] ?? {},
    defaultStyles: {},
    defaultResponsive: {},
    defaultAnimation: { enabled: false },
    translatableFields: BLOCK_TRANSLATABLE_FIELDS[type] ?? [],
    componentKey: type,
  };
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = (
  Object.keys(BASE_META) as BlockType[]
).map(def);

export const BLOCK_DEFINITION_MAP = new Map<BlockType, BlockDefinition>(
  BLOCK_DEFINITIONS.map((d) => [d.type, d])
);
