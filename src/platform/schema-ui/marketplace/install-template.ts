import type { SchemaDocument } from "../schema/schema-document";
import { getMarketplaceTemplate } from "./template-marketplace";
import { buildSchemaFromManifestIds } from "../ai/schema-builder";

export function installMarketplaceTemplate(templateId: string): SchemaDocument {
  const template = getMarketplaceTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown marketplace template: ${templateId}`);
  }

  const bindingIds = template.manifestIds.map((m) => m.replace(/Field$/, ""));
  const steps =
    templateId === "rfq"
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
