"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { jsonStoreService } from "./json-store.service";
import { databaseService } from "./database.service";
import {
  ALLOWED_JSON_NAMESPACES,
  BROWSABLE_TABLES,
  type BrowsableTableKey,
  type JsonNamespace,
} from "./constants";
import type { Prisma } from "@prisma/client";

export async function getDatabaseOverviewAction() {
  await requireAdmin();
  return databaseService.getOverview();
}

export async function getSchemaInspectorAction() {
  await requireAdmin();
  return databaseService.getSchemaInspector();
}

export async function listJsonRecordsAction(namespace: string) {
  await requireAdmin();
  if (!ALLOWED_JSON_NAMESPACES.includes(namespace as JsonNamespace)) {
    throw new Error("Namespace not allowed");
  }
  return jsonStoreService.listNamespace(namespace);
}

export async function upsertJsonRecordAction(
  namespace: string,
  key: string,
  json: string
) {
  await requireAdmin();
  if (!ALLOWED_JSON_NAMESPACES.includes(namespace as JsonNamespace)) {
    throw new Error("Namespace not allowed");
  }
  const data = JSON.parse(json) as Prisma.InputJsonValue;
  await jsonStoreService.set(namespace, key, data);
  revalidatePath("/admin/database");
  return { ok: true };
}

export async function deleteJsonRecordAction(namespace: string, key: string) {
  await requireAdmin();
  await jsonStoreService.delete(namespace, key);
  revalidatePath("/admin/database");
  return { ok: true };
}

export async function exportJsonNamespace(namespace: string) {
  await requireAdmin();
  if (!namespace) {
    const backup = await jsonStoreService.backupAll();
    return backup.records.reduce(
      (acc, r) => {
        acc[`${r.namespace}:${r.key}`] = r.data as Prisma.InputJsonValue;
        return acc;
      },
      {} as Record<string, Prisma.InputJsonValue>
    );
  }
  if (!ALLOWED_JSON_NAMESPACES.includes(namespace as JsonNamespace)) {
    throw new Error("Namespace not allowed");
  }
  return jsonStoreService.exportNamespace(namespace);
}

export async function importJsonNamespace(namespace: string, json: string) {
  await requireAdmin();
  if (!ALLOWED_JSON_NAMESPACES.includes(namespace as JsonNamespace)) {
    throw new Error("Namespace not allowed");
  }
  const data = JSON.parse(json) as Record<string, Prisma.InputJsonValue>;
  await jsonStoreService.importNamespace(namespace, data);
  revalidatePath("/admin/database");
}

export async function backupJsonStore(): Promise<string> {
  await requireAdmin();
  const backup = await jsonStoreService.backupAll();
  return JSON.stringify(backup, null, 2);
}

export async function restoreJsonStore(json: string) {
  await requireAdmin();
  const parsed = JSON.parse(json) as
    | { version?: number; records: Array<{ namespace: string; key: string; data: Prisma.InputJsonValue }> }
    | Array<{ namespace: string; key: string; data: Prisma.InputJsonValue }>;

  const rows = Array.isArray(parsed) ? parsed : parsed.records;
  if (!rows?.length) throw new Error("Invalid backup format");

  for (const row of rows) {
    if (!ALLOWED_JSON_NAMESPACES.includes(row.namespace as JsonNamespace)) continue;
    await jsonStoreService.set(row.namespace, row.key, row.data);
  }
  revalidatePath("/admin/database");
  return { restored: rows.length };
}

export async function listRelationalRecordsAction(
  table: BrowsableTableKey,
  page = 1
) {
  await requireAdmin();
  if (!(table in BROWSABLE_TABLES)) throw new Error("Table not allowed");
  return databaseService.listBrowsable(table, page, 25);
}

export async function getRelationalRecordAction(table: BrowsableTableKey, id: string) {
  await requireAdmin();
  return databaseService.getBrowsableRecord(table, id);
}
