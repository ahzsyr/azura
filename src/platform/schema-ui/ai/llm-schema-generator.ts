import type { SchemaDocument } from "../schema/schema-document";
import { buildSchemaFromManifestIds } from "./schema-builder";

type LlmSchemaResponse = {
  manifestIds?: string[];
  steps?: Array<{ id: string; title: string; bindingIds: string[] }>;
};

const SYSTEM_PROMPT = `You generate form schema manifests for a schema-driven UI platform.
Respond with JSON only: { "manifestIds": string[], "steps"?: { "id": string, "title": string, "bindingIds": string[] }[] }
Valid manifestIds: textField, emailField, phoneField, textareaField, selectField, checkboxField, radioField, numberField, dateField, fileField, hiddenField, ratingField, npsField.
Use bindingIds without the "Field" suffix (e.g. "email" not "emailField").`;

export async function generateSchemaViaLlm(prompt: string): Promise<SchemaDocument | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as LlmSchemaResponse;
    const manifestIds = (parsed.manifestIds ?? []).map((id) =>
      id.endsWith("Field") ? id : `${id}Field`,
    );
    if (manifestIds.length === 0) return null;
    return buildSchemaFromManifestIds(manifestIds, parsed.steps);
  } catch {
    return null;
  }
}
