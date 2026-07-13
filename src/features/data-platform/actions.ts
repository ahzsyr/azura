"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { jsonStoreService } from "@/features/storage/json-store.service";
import { platformService } from "./services/platform.service";
import { diagnosticsEngine } from "./diagnostics/engine";
import { BROWSABLE_SOURCES, JSON_STORE_SOURCES } from "./registry/data-sources";
import { ALLOWED_JSON_NAMESPACES, type JsonNamespace } from "@/features/storage/constants";
import { mysqlProvider } from "./services/mysql-provider";
import prismaMetadataRaw from "@/generated/prisma-metadata.json";
import type { PrismaMetadata } from "./types";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ADMIN_PATH = "/admin/database";

// ---------------------------------------------------------------------------
// Overview / schema
// ---------------------------------------------------------------------------

export async function getPlatformOverviewAction() {
  await requireAdmin();
  return platformService.getOverview();
}

export async function getSchemaExplorerAction() {
  await requireAdmin();
  return platformService.getSchemaExplorer();
}

// ---------------------------------------------------------------------------
// JSON store CRUD
// ---------------------------------------------------------------------------

function assertAllowedNamespace(namespace: string): asserts namespace is JsonNamespace {
  if (!ALLOWED_JSON_NAMESPACES.includes(namespace as JsonNamespace)) {
    throw new Error("Namespace not allowed");
  }
}

export async function listJsonRecordsAction(namespace: string) {
  await requireAdmin();
  assertAllowedNamespace(namespace);
  return jsonStoreService.listNamespace(namespace);
}

export async function upsertJsonRecordAction(namespace: string, key: string, json: string) {
  await requireAdmin();
  assertAllowedNamespace(namespace);
  const data = JSON.parse(json) as Prisma.InputJsonValue;
  await jsonStoreService.set(namespace, key, data, { revalidate: true });
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function deleteJsonRecordAction(namespace: string, key: string) {
  await requireAdmin();
  assertAllowedNamespace(namespace);
  await jsonStoreService.delete(namespace, key);
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// JSON namespace export / import / backup / restore
// ---------------------------------------------------------------------------

export async function exportJsonNamespaceAction(namespace: string) {
  await requireAdmin();
  if (!namespace) {
    const backup = await jsonStoreService.backupAll();
    return backup.records.reduce(
      (acc: Record<string, Prisma.InputJsonValue>, r: { namespace: string; key: string; data: unknown }) => {
        acc[`${r.namespace}:${r.key}`] = r.data as Prisma.InputJsonValue;
        return acc;
      },
      {} as Record<string, Prisma.InputJsonValue>
    );
  }
  assertAllowedNamespace(namespace);
  return jsonStoreService.exportNamespace(namespace);
}

export async function importJsonNamespaceAction(namespace: string, json: string) {
  await requireAdmin();
  assertAllowedNamespace(namespace);
  const data = JSON.parse(json) as Record<string, Prisma.InputJsonValue>;
  await jsonStoreService.importNamespace(namespace, data);
  revalidatePath(ADMIN_PATH);
}

export async function backupJsonStoreAction(): Promise<string> {
  await requireAdmin();
  const backup = await jsonStoreService.backupAll();
  return JSON.stringify(backup, null, 2);
}

export async function restoreJsonStoreAction(json: string) {
  await requireAdmin();
  const parsed = JSON.parse(json) as
    | { version?: number; records: Array<{ namespace: string; key: string; data: Prisma.InputJsonValue }> }
    | Array<{ namespace: string; key: string; data: Prisma.InputJsonValue }>;

  const rows = Array.isArray(parsed) ? parsed : parsed.records;
  if (!rows?.length) throw new Error("Invalid backup format");

  let restored = 0;
  for (const row of rows) {
    if (!ALLOWED_JSON_NAMESPACES.includes(row.namespace as JsonNamespace)) continue;
    await jsonStoreService.set(row.namespace, row.key, row.data, { revalidate: true });
    restored++;
  }
  revalidatePath(ADMIN_PATH);
  return { restored };
}

// ---------------------------------------------------------------------------
// Data Explorer (MySQL read-only)
// ---------------------------------------------------------------------------

export async function listDataSourceRecordsAction(sourceId: string, page = 1) {
  await requireAdmin();
  const allowed = BROWSABLE_SOURCES.some((s) => s.id === sourceId);
  if (!allowed) throw new Error("Source not allowed");
  return platformService.listRecords(sourceId, page);
}

export async function inspectDataSourceRecordAction(sourceId: string, id: string) {
  await requireAdmin();
  const allowed = BROWSABLE_SOURCES.some((s) => s.id === sourceId);
  if (!allowed) throw new Error("Source not allowed");
  return platformService.inspectRecord(sourceId, id);
}

export async function searchDataSourcesAction(query: string) {
  await requireAdmin();
  if (!query || query.trim().length < 2) return [];
  return platformService.searchSources(query);
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export async function runDiagnosticsAction() {
  await requireAdmin();
  return diagnosticsEngine.runAll();
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Clear all keys in a given JSON namespace.
 * Only cache-category namespaces can be bulk-cleared (config/theme/seo are skipped).
 */
export async function clearJsonNamespaceAction(namespace: string) {
  await requireAdmin();
  assertAllowedNamespace(namespace);

  // Only allow clearing namespaces tagged as "cache" category
  const src = JSON_STORE_SOURCES.find((s) => s.namespace === namespace);
  if (src?.jsonCategory !== "cache") {
    throw new Error(`Namespace "${namespace}" is not a cache namespace and cannot be bulk-cleared.`);
  }

  const rows = await jsonStoreService.listNamespace(namespace);
  let cleared = 0;
  for (const row of rows) {
    await jsonStoreService.delete(namespace, row.key);
    cleared++;
  }
  revalidatePath(ADMIN_PATH);
  return { cleared };
}

/**
 * Revalidate the main admin routes and the public home page, forcing Next.js
 * to flush the server-side cache for those paths.
 */
export async function revalidateAdminPathsAction() {
  await requireAdmin();
  const paths = [
    "/admin",
    "/admin/dashboard",
    "/admin/database",
    "/admin/pages",
    "/admin/posts",
    "/admin/content",
    "/admin/faqs",
    "/admin/gallery",
    "/admin/testimonials",
    "/",
  ];
  for (const p of paths) {
    revalidatePath(p);
  }
  return { revalidated: paths.length };
}

/**
 * Export a full platform report: overview counts + diagnostics.
 * Returned as a JSON string suitable for download.
 */
export async function exportPlatformReportAction(): Promise<string> {
  await requireAdmin();
  const [overview, schema, diagnostics] = await Promise.all([
    platformService.getOverview(),
    platformService.getSchemaExplorer(),
    diagnosticsEngine.runAll(),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    profile: overview.activeProfile,
    counts: {
      json: overview.jsonEntries,
      relational: overview.relationalCounts,
      healthSignals: overview.healthSignals,
    },
    schema: {
      total: schema.length,
      byCategory: schema.reduce(
        (acc: Record<string, number>, m) => {
          acc[m.category] = (acc[m.category] ?? 0) + 1;
          return acc;
        },
        {}
      ),
    },
    diagnostics: {
      summary: diagnostics.summary,
      results: diagnostics.results.map((r) => ({
        checkId: r.checkId,
        status: r.status,
        message: r.message,
        count: r.count,
      })),
    },
  };

  return JSON.stringify(report, null, 2);
}

// ---------------------------------------------------------------------------
// Schema Field Viewer (Phase 4)
// ---------------------------------------------------------------------------

/**
 * Returns the field metadata for a single Prisma model, fetched lazily
 * when the user expands a model row in the Schema Explorer.
 */
export async function getModelFieldsAction(modelName: string) {
  await requireAdmin();
  const metadata = prismaMetadataRaw as PrismaMetadata;
  return metadata.models.find((m) => m.name === modelName)?.fields ?? [];
}

// ---------------------------------------------------------------------------
// Data Export (Phase 4)
// ---------------------------------------------------------------------------

/** Convert an array of flat/mixed objects to a CSV string. */
function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined
      ? ""
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Export all records (up to 500) for a browsable source as JSON or CSV.
 * Returns the serialised string for the client to download.
 */
export async function exportDataSourceRecordsAction(
  sourceId: string,
  format: "json" | "csv"
): Promise<string> {
  await requireAdmin();
  const allowed = BROWSABLE_SOURCES.some((s) => s.id === sourceId);
  if (!allowed) throw new Error("Source not allowed");

  const items = await mysqlProvider.exportAll(sourceId, 500);
  const rows = items as Array<Record<string, unknown>>;

  if (format === "json") {
    return JSON.stringify(rows, null, 2);
  }
  return toCSV(rows);
}

// ---------------------------------------------------------------------------
// Diagnostic fix actions
// ---------------------------------------------------------------------------

/**
 * Marks stale form submissions (NEW + older than 7 days) as CONTACTED.
 * Wired to the "Mark as reviewed" button in the Diagnostics tab.
 */
export async function markStaleFormSubmissionsAction(): Promise<{ updated: number }> {
  await requireAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const db = prisma as unknown as {
    formSubmission: {
      updateMany: (args: {
        where: { status: string; createdAt: { lt: Date } };
        data: { status: string };
      }) => Promise<{ count: number }>;
    };
  };
  const result = await db.formSubmission.updateMany({
    where: { status: "NEW", createdAt: { lt: sevenDaysAgo } },
    data: { status: "CONTACTED" },
  });
  revalidatePath(ADMIN_PATH);
  return { updated: result.count };
}
