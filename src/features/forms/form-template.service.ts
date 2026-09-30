import crypto from "crypto";
import { Prisma, type FormTemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseFormTemplateDefinition } from "@/features/forms/adapters/schema-document.adapter";
import { parseAllowedAdminIds } from "@/features/forms/lib/form-permissions";
import {
  defaultDocumentForCategory,
  loadDocumentFromRaw,
  serializeDocumentEnvelope,
  wrapDocumentEnvelope,
  type DocumentExtensions,
} from "@/features/forms/lib/document-envelope";
import { compileRuntimeDefinition } from "@/features/forms/compiler";
import type { FormTemplateDefinition } from "@/features/forms/types";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

export type FormTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  description: string | null;
  /** Disposable compiled runtime definition. */
  definition: FormTemplateDefinition;
  /** Canonical versioned authoring envelope (always present after backfill). */
  definitionRaw: unknown;
  schemaDocument: SchemaDocument;
  extensions: DocumentExtensions;
  meta?: import("@/features/forms/lib/document-envelope").DocumentEnvelopeMeta;
  isPublished: boolean;
  publishedVersion: number | null;
  updatedAt: Date;
};

function toRecord(row: {
  id: string;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  description: string | null;
  definition: unknown;
  definitionRaw?: unknown;
  isPublished: boolean;
  publishedVersion?: number | null;
  allowedAdminIds?: unknown;
  updatedAt: Date;
}): FormTemplateRecord {
  const { document, extensions, meta } = loadDocumentFromRaw(row.definitionRaw, row.definition);
  const compiled =
    row.definition != null && typeof row.definition === "object" && Array.isArray((row.definition as { fields?: unknown }).fields)
      ? parseFormTemplateDefinition(row.definition)
      : compileRuntimeDefinition(document, extensions);
  const allowedAdminIds = parseAllowedAdminIds(row.allowedAdminIds);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
    definition: {
      ...compiled,
      allowedAdminIds: allowedAdminIds.length > 0 ? allowedAdminIds : compiled.allowedAdminIds,
    },
    definitionRaw: row.definitionRaw ?? serializeDocumentEnvelope(wrapDocumentEnvelope(document, extensions, meta)),
    schemaDocument: document,
    extensions,
    meta,
    isPublished: row.isPublished,
    publishedVersion: row.publishedVersion ?? null,
    updatedAt: row.updatedAt,
  };
}

export type FormTemplateListItem = FormTemplateRecord & {
  submissionCount: number;
  fieldCount: number;
  hasSteps: boolean;
  hasAutomation: boolean;
  hasWebhook: boolean;
  hasAbTests: boolean;
};

export async function listFormTemplates(category?: FormTemplateCategory): Promise<FormTemplateListItem[]> {
  const rows = await prisma.formTemplate.findMany({
    where: category ? { category } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  return rows.map((row) => {
    const record = toRecord(row);
    return {
      ...record,
      submissionCount: row._count.submissions,
      fieldCount: record.definition.fields?.length ?? record.schemaDocument.bindings.length,
      hasSteps: Boolean(record.schemaDocument.steps?.length || record.definition.steps?.length),
      hasAutomation: Boolean(record.definition.automationRules?.length),
      hasWebhook: Boolean(record.definition.webhooks?.length),
      hasAbTests: Boolean(record.definition.abTests?.some((t) => t.enabled)),
    };
  });
}

export async function getFormTemplateById(id: string) {
  const row = await prisma.formTemplate.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}

export async function getFormTemplateBySlug(slug: string) {
  const row = await prisma.formTemplate.findUnique({ where: { slug } });
  return row ? toRecord(row) : null;
}

export async function createFormTemplate(input: {
  name: string;
  slug: string;
  category?: FormTemplateCategory;
  description?: string;
  document?: SchemaDocument;
  extensions?: DocumentExtensions;
  isPublished?: boolean;
  /** @deprecated Prefer document + extensions */
  definition?: FormTemplateDefinition;
}) {
  const category = input.category ?? "GENERAL";
  let document = input.document;
  let extensions = input.extensions ?? {};
  if (!document) {
    if (input.definition) {
      const rebuilt = loadDocumentFromRaw(null, input.definition);
      document = rebuilt.document;
      extensions = { ...rebuilt.extensions, ...extensions };
    } else {
      const defaults = defaultDocumentForCategory(category);
      document = defaults.document;
      extensions = { ...defaults.extensions, ...extensions };
    }
  }
  const runtime = compileRuntimeDefinition(document, extensions);
  const envelope = serializeDocumentEnvelope(wrapDocumentEnvelope(document, extensions));

  const row = await prisma.formTemplate.create({
    data: {
      name: input.name,
      slug: input.slug,
      category,
      description: input.description,
      definition: runtime as object,
      definitionRaw: envelope as object,
      allowedAdminIds: (extensions.allowedAdminIds ?? []) as object,
      isPublished: input.isPublished ?? true,
    },
  });
  return toRecord(row);
}

export async function updateFormTemplate(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    category: FormTemplateCategory;
    description: string | null;
    document: SchemaDocument;
    extensions: DocumentExtensions;
    isPublished: boolean;
  }>,
) {
  const data: Record<string, unknown> = {
    name: input.name,
    slug: input.slug,
    category: input.category,
    description: input.description,
    isPublished: input.isPublished,
  };

  if (input.document) {
    const extensions = input.extensions ?? {};
    const runtime = compileRuntimeDefinition(input.document, extensions);
    data.definition = runtime as object;
    data.definitionRaw = serializeDocumentEnvelope(wrapDocumentEnvelope(input.document, extensions)) as object;
    if (extensions.allowedAdminIds) {
      data.allowedAdminIds = extensions.allowedAdminIds as object;
    }
  }

  const row = await prisma.formTemplate.update({
    where: { id },
    data,
  });
  return toRecord(row);
}

export async function deleteFormTemplate(id: string) {
  await prisma.formTemplate.delete({ where: { id } });
}

export async function duplicateFormTemplate(id: string) {
  const source = await getFormTemplateById(id);
  if (!source) throw new Error("Template not found");
  const slug = `${source.slug}-copy-${Date.now().toString(36).slice(-4)}`;
  return createFormTemplate({
    name: `${source.name} (Copy)`,
    slug,
    category: source.category,
    description: source.description ?? undefined,
    document: source.schemaDocument,
    extensions: source.extensions,
  });
}

/** Backfill definitionRaw for templates that only have compiled definition. */
export async function backfillDefinitionRaw(): Promise<number> {
  const rows = await prisma.formTemplate.findMany({
    where: { definitionRaw: { equals: Prisma.DbNull } },
    select: { id: true, definition: true },
  });
  let count = 0;
  for (const row of rows) {
    const { document, extensions } = loadDocumentFromRaw(null, row.definition);
    const envelope = serializeDocumentEnvelope(wrapDocumentEnvelope(document, extensions));
    const runtime = compileRuntimeDefinition(document, extensions);
    await prisma.formTemplate.update({
      where: { id: row.id },
      data: {
        definitionRaw: envelope as object,
        definition: runtime as object,
      },
    });
    count += 1;
  }
  return count;
}

export function slugifyFormName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || `form-${crypto.randomBytes(4).toString("hex")}`
  );
}
