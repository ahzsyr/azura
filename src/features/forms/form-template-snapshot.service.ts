import "server-only";

import { prisma } from "@/lib/prisma";
import { compileRuntimeDefinition } from "@/features/forms/compiler";
import {
  loadDocumentFromRaw,
  serializeDocumentEnvelope,
  wrapDocumentEnvelope,
} from "@/features/forms/lib/document-envelope";
import type { FormTemplateDefinition } from "@/features/forms/types";

export type FormTemplateSnapshotRecord = {
  id: string;
  templateId: string;
  version: number;
  label: string | null;
  definition: FormTemplateDefinition;
  definitionRaw: unknown;
  publishedAt: Date;
  createdById: string | null;
};

function toSnapshot(row: {
  id: string;
  templateId: string;
  version: number;
  label: string | null;
  definition: unknown;
  publishedAt: Date;
  createdById: string | null;
}): FormTemplateSnapshotRecord {
  const { document, extensions } = loadDocumentFromRaw(row.definition, row.definition);
  return {
    id: row.id,
    templateId: row.templateId,
    version: row.version,
    label: row.label,
    definition: compileRuntimeDefinition(document, extensions),
    definitionRaw: row.definition,
    publishedAt: row.publishedAt,
    createdById: row.createdById,
  };
}

export async function listFormTemplateSnapshots(templateId: string): Promise<FormTemplateSnapshotRecord[]> {
  const rows = await prisma.formTemplateSnapshot.findMany({
    where: { templateId },
    orderBy: { version: "desc" },
    take: 20,
  });
  return rows.map(toSnapshot);
}

export async function publishFormTemplateSnapshot(
  templateId: string,
  createdById?: string,
  label?: string,
): Promise<FormTemplateSnapshotRecord> {
  const template = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template not found");

  const latest = await prisma.formTemplateSnapshot.findFirst({
    where: { templateId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  const { document, extensions } = loadDocumentFromRaw(
    (template as { definitionRaw?: unknown }).definitionRaw,
    template.definition,
  );
  const envelope = serializeDocumentEnvelope(wrapDocumentEnvelope(document, extensions));

  const snapshot = await prisma.formTemplateSnapshot.create({
    data: {
      templateId,
      version,
      label: label ?? `v${version}`,
      definition: envelope as object,
      createdById: createdById ?? null,
    },
  });

  await prisma.formTemplate.update({
    where: { id: templateId },
    data: { isPublished: true, publishedVersion: version },
  });

  return toSnapshot(snapshot);
}

export async function rollbackFormTemplateToSnapshot(
  templateId: string,
  snapshotId: string,
  createdById?: string,
): Promise<FormTemplateSnapshotRecord> {
  const snapshot = await prisma.formTemplateSnapshot.findFirst({
    where: { id: snapshotId, templateId },
  });
  if (!snapshot) throw new Error("Snapshot not found");

  const { document, extensions } = loadDocumentFromRaw(snapshot.definition, snapshot.definition);
  const runtime = compileRuntimeDefinition(document, extensions);
  const envelope = serializeDocumentEnvelope(wrapDocumentEnvelope(document, extensions));

  await prisma.formTemplate.update({
    where: { id: templateId },
    data: {
      definition: runtime as object,
      definitionRaw: envelope as object,
    },
  });

  return publishFormTemplateSnapshot(templateId, createdById, `Rollback to v${snapshot.version}`);
}
