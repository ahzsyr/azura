import "server-only";

import { createWriteStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveLocalUploadsDiskDir } from "@/lib/local-public-path";
import {
  buildInsertStatement,
  listApplicationTableNames,
  quoteMysqlIdentifier,
  readSqlName,
} from "@/features/setup/application-tables";
import { StoreZipWriter } from "@/features/setup/store-zip";

const INSERT_BATCH = 200;

async function listColumns(table: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
    Prisma.sql`SELECT COLUMN_NAME AS columnName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} ORDER BY ORDINAL_POSITION`,
  );
  return rows
    .map((row) => readSqlName(row, ["columnName", "COLUMN_NAME"]))
    .filter((name): name is string => Boolean(name));
}

async function writeTableDump(
  stream: NodeJS.WritableStream,
  table: string,
): Promise<void> {
  const columns = await listColumns(table);
  const quoted = quoteMysqlIdentifier(table);
  await writeChunk(stream, `-- ${quoted}\nDELETE FROM ${quoted};\n`);
  if (columns.length === 0) return;

  let offset = 0;
  while (true) {
    const orderBy = columns.includes("id") ? ` ORDER BY ${quoteMysqlIdentifier("id")}` : "";
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM ${quoted}${orderBy} LIMIT ${INSERT_BATCH} OFFSET ${offset}`,
    );
    if (rows.length === 0) break;
    await writeChunk(stream, `${buildInsertStatement(table, columns, rows)}\n`);
    if (rows.length < INSERT_BATCH) break;
    offset += rows.length;
  }
}

function writeChunk(stream: NodeJS.WritableStream, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(text, "utf8", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/** Write a MySQL INSERT dump of every application table. */
export async function writeDatabaseSqlDump(destPath: string): Promise<void> {
  const stream = createWriteStream(destPath, { encoding: "utf8" });
  try {
    await writeChunk(
      stream,
      "-- Azura database backup\nSET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\n",
    );
    const tables = await listApplicationTableNames(async (sql) =>
      (await prisma.$queryRawUnsafe(sql)) as Array<Record<string, unknown>>,
    );
    for (const table of tables) {
      await writeTableDump(stream, table);
    }
    await writeChunk(stream, "SET FOREIGN_KEY_CHECKS = 1;\n");
    stream.end();
    await finished(stream);
  } catch (error) {
    stream.destroy();
    throw error;
  }
}

async function addDirectory(zip: StoreZipWriter, dir: string, prefix: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const abs = join(dir, entry.name);
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await addDirectory(zip, abs, name);
    } else if (entry.isFile()) {
      await zip.addFile(name, abs);
    }
  }
}

/** Add database.sql plus the local uploads tree under media/. */
export async function writeSiteBackupZip(zip: StoreZipWriter, sqlPath: string): Promise<void> {
  await zip.addFile("database.sql", sqlPath);
  await addDirectory(zip, resolveLocalUploadsDiskDir(), "media");
  await zip.finish();
}
