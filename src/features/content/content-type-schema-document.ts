import { contentTypeSchema } from "@/schemas/content/content-type";
import type { ContentFieldDefinition } from "@/features/content/types";

function parseRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function extractSchemaPayload(raw: unknown): {
  fieldSchema: unknown;
  displaySchema: unknown;
  adminConfig: unknown;
} {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid schema document");
  }
  const doc = raw as Record<string, unknown>;

  if (doc.kind === "content-type-schema") {
    return {
      fieldSchema: doc.fieldSchema,
      displaySchema: doc.displaySchema,
      adminConfig: doc.adminConfig,
    };
  }

  // Accept a full export and take only schema fields (ignore identity + items).
  const contentType = doc.contentType;
  if (contentType && typeof contentType === "object") {
    const ct = contentType as Record<string, unknown>;
    return {
      fieldSchema: ct.fieldSchema,
      displaySchema: ct.displaySchema,
      adminConfig: ct.adminConfig,
    };
  }

  if ("fieldSchema" in doc || "displaySchema" in doc || "adminConfig" in doc) {
    return {
      fieldSchema: doc.fieldSchema,
      displaySchema: doc.displaySchema,
      adminConfig: doc.adminConfig,
    };
  }

  throw new Error("Document does not contain a content type schema");
}

/** Parse a schema or full export document; identity fields are ignored by schema import. */
export function parseContentTypeSchemaDocument(raw: unknown): {
  fieldSchema: ContentFieldDefinition[];
  displaySchema: Record<string, unknown>;
  adminConfig: Record<string, unknown>;
} {
  const payload = extractSchemaPayload(raw);
  const fieldSchema = contentTypeSchema.shape.fieldSchema.parse(payload.fieldSchema ?? []);
  return {
    fieldSchema,
    displaySchema: parseRecord(payload.displaySchema),
    adminConfig: parseRecord(payload.adminConfig),
  };
}
