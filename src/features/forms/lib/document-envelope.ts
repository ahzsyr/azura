import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import {
  createEmptySchemaDocument,
  LATEST_SCHEMA_VERSION,
} from "@/platform/schema-ui/schema/schema-document";
import { runSchemaMigrations } from "@/platform/schema-ui/schema/migrations";
import { formDefinitionToSchemaDocument } from "@/features/forms/adapters/schema-document.adapter";

/** Store envelope version (independent of SchemaDocument.definitionVersion). */
export const DOCUMENT_ENVELOPE_VERSION = 2;

export type DocumentExtensions = Partial<
  Pick<
    FormTemplateDefinition,
    | "scoringRules"
    | "notifications"
    | "webhooks"
    | "pipeline"
    | "routingRules"
    | "destinations"
    | "automationRules"
    | "allowedAdminIds"
    | "abTests"
  >
>;

export type DesignerComment = {
  id: string;
  targetType: "binding" | "node";
  targetId: string;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: string;
};

export type DocumentEnvelopeMeta = {
  designerComments?: DesignerComment[];
};

export type DocumentEnvelope = {
  version: number;
  document: SchemaDocument;
  extensions?: DocumentExtensions;
  /** Authoring-only metadata; never compiled into FormTemplateDefinition. */
  meta?: DocumentEnvelopeMeta;
};

const EXTENSION_KEYS = [
  "scoringRules",
  "notifications",
  "webhooks",
  "pipeline",
  "routingRules",
  "destinations",
  "automationRules",
  "allowedAdminIds",
  "abTests",
] as const;

export function wrapDocumentEnvelope(
  document: SchemaDocument,
  extensions: DocumentExtensions = {},
  meta?: DocumentEnvelopeMeta,
): DocumentEnvelope {
  return {
    version: DOCUMENT_ENVELOPE_VERSION,
    document: {
      ...document,
      definitionVersion: document.definitionVersion ?? LATEST_SCHEMA_VERSION,
    },
    extensions: pickExtensions(extensions),
    meta,
  };
}

export function serializeDocumentEnvelope(envelope: DocumentEnvelope): object {
  return {
    version: envelope.version,
    document: envelope.document,
    extensions: envelope.extensions ?? {},
    meta: envelope.meta ?? {},
  };
}

/**
 * Load from definitionRaw. Migrates envelope version and SchemaDocument.
 * Fallback reconstructs from compiled definition when raw is missing (migration only).
 */
export function loadDocumentFromRaw(
  definitionRaw: unknown,
  compiledFallback?: unknown,
): { document: SchemaDocument; extensions: DocumentExtensions; meta: DocumentEnvelopeMeta } {
  if (definitionRaw != null && typeof definitionRaw === "object") {
    return unwrapAndMigrate(definitionRaw as Record<string, unknown>);
  }
  const rebuilt = reconstructDocumentFromCompiled(compiledFallback);
  return { ...rebuilt, meta: {} };
}

/** Migration utility — do not use from designer after backfill. */
export function reconstructDocumentFromCompiled(compiled: unknown): {
  document: SchemaDocument;
  extensions: DocumentExtensions;
  meta: DocumentEnvelopeMeta;
} {
  if (compiled == null || typeof compiled !== "object") {
    return { document: createEmptySchemaDocument(), extensions: {}, meta: {} };
  }
  const raw = compiled as Record<string, unknown>;
  const document = formDefinitionToSchemaDocument(raw as unknown as FormTemplateDefinition);
  return {
    document,
    extensions: pickExtensions(raw as DocumentExtensions),
    meta: {},
  };
}

function unwrapAndMigrate(raw: Record<string, unknown>): {
  document: SchemaDocument;
  extensions: DocumentExtensions;
  meta: DocumentEnvelopeMeta;
} {
  let version = Number(raw.version ?? 0);
  let payload = raw;

  if (!("document" in raw) || raw.document == null) {
    if (Array.isArray(raw.nodes) || Array.isArray(raw.bindings) || Array.isArray(raw.fields)) {
      const migrated = runSchemaMigrations(raw);
      const legacy = (raw._legacy as Record<string, unknown> | undefined) ?? {};
      return {
        document: migrated,
        extensions: pickExtensions({ ...raw, ...legacy } as DocumentExtensions),
        meta: (raw.meta as DocumentEnvelopeMeta) ?? {},
      };
    }
    version = 0;
  }

  while (version < DOCUMENT_ENVELOPE_VERSION) {
    payload = migrateEnvelope(payload, version, version + 1);
    version += 1;
  }

  const docRaw = (payload.document ?? {}) as Record<string, unknown>;
  const document = runSchemaMigrations(docRaw);
  const extensions = pickExtensions(
    (payload.extensions as DocumentExtensions) ?? pickExtensions(payload as DocumentExtensions),
  );
  const meta = (payload.meta as DocumentEnvelopeMeta) ?? {};
  return { document, extensions, meta };
}

function migrateEnvelope(
  payload: Record<string, unknown>,
  from: number,
  to: number,
): Record<string, unknown> {
  if (from === 0 && to === 1) {
    return {
      version: 1,
      document: payload.document ?? payload,
      extensions: payload.extensions ?? pickExtensions(payload as DocumentExtensions),
    };
  }
  if (from === 1 && to === 2) {
    return { ...payload, version: 2 };
  }
  return { ...payload, version: to };
}

export function pickExtensions(source: DocumentExtensions | Record<string, unknown>): DocumentExtensions {
  const out: DocumentExtensions = {};
  for (const key of EXTENSION_KEYS) {
    if (source[key] !== undefined) {
      (out as Record<string, unknown>)[key] = source[key];
    }
  }
  return out;
}

export function defaultDocumentForCategory(category: string): {
  document: SchemaDocument;
  extensions: DocumentExtensions;
} {
  return reconstructDocumentFromCompiled(categoryDefaultFlat(category));
}

function categoryDefaultFlat(category: string): FormTemplateDefinition {
  if (category === "LEAD") {
    return {
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "phone", type: "phone", label: "Phone", required: false },
        { id: "company", type: "text", label: "Company", required: false },
      ],
      scoringRules: [{ fieldId: "company", match: ".+", points: 10 }],
      notifications: { receiverEmails: [], sendToSubmitter: false },
      webhooks: [],
    };
  }
  if (category === "CONTACT") {
    return {
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "message", type: "textarea", label: "Message", required: true },
      ],
      notifications: { receiverEmails: [], sendToSubmitter: true },
      webhooks: [],
    };
  }
  if (category === "SURVEY") {
    return {
      fields: [
        { id: "rating", type: "number", label: "How satisfied are you?", required: true },
        { id: "feedback", type: "textarea", label: "Additional feedback", required: false },
      ],
      notifications: { receiverEmails: [], sendToSubmitter: false },
    };
  }
  if (category === "MULTI_STEP") {
    return {
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "details", type: "textarea", label: "Details", required: false },
      ],
      steps: [
        { id: "step1", title: "Contact", fieldIds: ["name", "email"] },
        { id: "step2", title: "Details", fieldIds: ["details"] },
      ],
      notifications: { receiverEmails: [], sendToSubmitter: false },
    };
  }
  return { fields: [], notifications: { receiverEmails: [], sendToSubmitter: false } };
}
