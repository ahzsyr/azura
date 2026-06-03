import type { ContentFieldDefinition } from "@/features/content/types";

export function buildAttributesFromForm(
  formData: FormData,
  fields: ContentFieldDefinition[]
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.localized) {
      const en = formData.get(`${field.key}En`);
      const ar = formData.get(`${field.key}Ar`);
      if (field.type === "json") {
        attrs[`${field.key}En`] = parseJsonField(en);
        attrs[`${field.key}Ar`] = parseJsonField(ar);
      } else {
        if (en) attrs[`${field.key}En`] = String(en);
        if (ar) attrs[`${field.key}Ar`] = String(ar);
      }
    } else {
      const val = formData.get(field.key);
      if (field.type === "boolean") {
        attrs[field.key] = val === "true";
      } else if (field.type === "number" || field.type === "price") {
        attrs[field.key] = val ? Number(val) : null;
      } else if (field.type === "json") {
        attrs[field.key] = parseJsonField(val);
      } else if (val) {
        attrs[field.key] = String(val);
      }
    }
  }
  return attrs;
}

function parseJsonField(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
