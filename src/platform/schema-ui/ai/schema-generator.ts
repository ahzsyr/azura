import type { SchemaDocument } from "../schema/schema-document";
import { getMarketplaceTemplate, listMarketplaceTemplates } from "../marketplace/template-marketplace";
import { buildSchemaFromManifestIds } from "./schema-builder";
import { generateSchemaViaLlm } from "./llm-schema-generator";

export type SchemaGenerationRequest = {
  prompt: string;
  featureContext?: "form" | "survey" | "onboarding" | "checkout";
};

function detectMarketplaceTemplate(prompt: string): string | null {
  const p = prompt.toLowerCase();
  if (p.includes("nps") || p.includes("net promoter")) return "nps";
  if (p.includes("csat") || p.includes("satisfaction")) return "csat";
  if (p.includes("rfq") || p.includes("quote")) return "rfq";
  if (p.includes("newsletter") || p.includes("subscribe")) return "newsletter";
  if (p.includes("booking") || p.includes("reservation")) return "booking";
  if (p.includes("support") || p.includes("ticket")) return "support";
  if (p.includes("contact")) return "contact";
  return null;
}

/** AI schema generator — LLM when configured, otherwise marketplace keyword matching. */
export async function generateSchemaFromPrompt(request: SchemaGenerationRequest): Promise<SchemaDocument> {
  const llmResult = await generateSchemaViaLlm(request.prompt);
  if (llmResult) return llmResult;

  const marketplaceId = detectMarketplaceTemplate(request.prompt);
  if (marketplaceId) {
    const template = getMarketplaceTemplate(marketplaceId);
    if (template) {
      const bindingIds = template.manifestIds.map((m) => m.replace(/Field$/, ""));
      const steps =
        marketplaceId === "rfq"
          ? [
              {
                id: "contact",
                title: "Contact",
                bindingIds: bindingIds.filter((id) => ["text", "email", "number"].includes(id)),
              },
              {
                id: "request",
                title: "Request",
                bindingIds: bindingIds.filter((id) => !["text", "email", "number"].includes(id)),
              },
            ]
          : undefined;
      return buildSchemaFromManifestIds(template.manifestIds, steps);
    }
  }

  const templates = listMarketplaceTemplates();
  const fallback = templates[0];
  return buildSchemaFromManifestIds(fallback?.manifestIds ?? ["textField", "emailField", "textareaField"]);
}
