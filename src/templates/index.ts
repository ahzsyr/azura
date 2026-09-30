export {
  TEMPLATE_DEFINITIONS,
  getTemplateDefinition,
  isActiveTemplateId,
  listTemplateDefinitions,
} from "@/templates/registry";

export { ProductCardTemplate, ProductDetailTemplate } from "@/templates/product";
export { ContentPresetCardTemplate, ContentPresetDetailTemplate } from "@/templates/content-preset";
export {
  resolveCardTemplateId,
  resolveDetailTemplateId,
  resolveCardTemplateIdFromContentType,
  resolvePresetFromContentTypeSlug,
  resolvePresetFromBlockProps,
  resolveContentTypeSlugForPreset,
  isContentPresetId,
  type ContentPresetId,
} from "@/templates/preset-template-map";
