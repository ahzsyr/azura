import type { TemplateDefinition, TemplateId } from "@/view-models/types";

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: "product-card",
    presetId: "product",
    variant: "card",
    status: "active",
    label: "Product card",
  },
  {
    id: "product-detail",
    presetId: "product",
    variant: "detail",
    status: "active",
    label: "Product detail",
  },
  {
    id: "product-compare",
    presetId: "product",
    variant: "compare",
    status: "planned",
    label: "Product compare",
  },
  {
    id: "destination-card",
    presetId: "destination",
    variant: "card",
    status: "active",
    label: "Destination card",
  },
  {
    id: "destination-detail",
    presetId: "destination",
    variant: "detail",
    status: "active",
    label: "Destination detail",
  },
  {
    id: "service-card",
    presetId: "service",
    variant: "card",
    status: "active",
    label: "Service card",
  },
  {
    id: "service-detail",
    presetId: "service",
    variant: "detail",
    status: "active",
    label: "Service detail",
  },
  {
    id: "property-card",
    presetId: "property",
    variant: "card",
    status: "active",
    label: "Property card",
  },
  {
    id: "property-detail",
    presetId: "property",
    variant: "detail",
    status: "active",
    label: "Property detail",
  },
  {
    id: "member-card",
    presetId: "team-member",
    variant: "card",
    status: "active",
    label: "Member card",
  },
  {
    id: "partner-card",
    presetId: "partner",
    variant: "card",
    status: "active",
    label: "Partner card",
  },
  {
    id: "plan-card",
    presetId: "pricing",
    variant: "card",
    status: "active",
    label: "Plan card",
  },
  {
    id: "plan-compare",
    presetId: "pricing",
    variant: "compare",
    status: "planned",
    label: "Plan compare",
  },
  {
    id: "knowledge-article-card",
    presetId: "knowledge",
    variant: "card",
    status: "active",
    label: "Knowledge article card",
  },
  {
    id: "knowledge-article-detail",
    presetId: "knowledge",
    variant: "detail",
    status: "active",
    label: "Knowledge article detail",
  },
  {
    id: "knowledge-category-list",
    presetId: "knowledge",
    variant: "card",
    status: "planned",
    label: "Knowledge category list",
  },
  {
    id: "entity-card",
    variant: "card",
    status: "active",
    label: "Entity card",
  },
  {
    id: "entity-detail",
    variant: "detail",
    status: "active",
    label: "Entity detail",
  },
  {
    id: "entity-list",
    variant: "card",
    status: "active",
    label: "Entity list",
  },
];

export function getTemplateDefinition(templateId: TemplateId): TemplateDefinition | null {
  return TEMPLATE_DEFINITIONS.find((entry) => entry.id === templateId) ?? null;
}

export function listTemplateDefinitions(options?: {
  presetId?: TemplateDefinition["presetId"];
  status?: TemplateDefinition["status"];
}): TemplateDefinition[] {
  return TEMPLATE_DEFINITIONS.filter((entry) => {
    if (options?.presetId && entry.presetId !== options.presetId) return false;
    if (options?.status && entry.status !== options.status) return false;
    return true;
  });
}

export function isActiveTemplateId(templateId: TemplateId): boolean {
  const definition = getTemplateDefinition(templateId);
  return definition?.status === "active";
}
