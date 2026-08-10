import type { UIComponentManifest } from "../manifests/types";

/** Internal template marketplace entries — pre-built schema templates by use case. */
export type MarketplaceTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  manifestIds: string[];
};

export const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  { id: "contact", name: "Contact", category: "general", description: "Basic contact form", manifestIds: ["textField", "emailField", "textareaField"] },
  { id: "rfq", name: "RFQ", category: "sales", description: "Request for quote", manifestIds: ["textField", "emailField", "numberField", "textareaField"] },
  { id: "support", name: "Support", category: "support", description: "Support ticket", manifestIds: ["textField", "emailField", "selectField", "textareaField"] },
  { id: "newsletter", name: "Newsletter", category: "marketing", description: "Email signup", manifestIds: ["emailField", "textField"] },
  { id: "booking", name: "Booking", category: "operations", description: "Booking request", manifestIds: ["textField", "emailField", "dateField", "selectField"] },
  { id: "nps", name: "NPS Survey", category: "survey", description: "Net Promoter Score (0–10)", manifestIds: ["npsField", "textareaField"] },
  { id: "csat", name: "CSAT", category: "survey", description: "Customer satisfaction rating", manifestIds: ["ratingField", "textareaField"] },
];

export function listMarketplaceTemplates(category?: string): MarketplaceTemplate[] {
  if (!category) return MARKETPLACE_TEMPLATES;
  return MARKETPLACE_TEMPLATES.filter((t) => t.category === category);
}

export function getMarketplaceTemplate(id: string): MarketplaceTemplate | undefined {
  return MARKETPLACE_TEMPLATES.find((t) => t.id === id);
}

export function listPluginManifests(manifests: UIComponentManifest[]): UIComponentManifest[] {
  return manifests.filter((m) => m.id.includes("."));
}
