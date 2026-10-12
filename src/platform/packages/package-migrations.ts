import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type PackageSqlFile = {
  filename: string;
  direction: "up" | "down";
  sql: string;
  checksum: string;
};

function checksumOf(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function packageMigrationsDir(packageId: string): string {
  return path.join(process.cwd(), "src", "modules", packageId, "migrations");
}

export function sqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith("--"));
}

export async function readPackageSqlFiles(packageId: string): Promise<PackageSqlFile[]> {
  let names: string[] = [];
  try {
    names = await readdir(packageMigrationsDir(packageId));
  } catch {
    return [];
  }
  const files: PackageSqlFile[] = [];
  for (const filename of names.sort()) {
    const direction = filename.endsWith(".up.sql") ? "up" : filename.endsWith(".down.sql") ? "down" : null;
    if (!direction) continue;
    const sql = await readFile(path.join(packageMigrationsDir(packageId), filename), "utf8");
    files.push({ filename, direction, sql, checksum: checksumOf(sql) });
  }
  return files;
}

export async function applyPackageSql(
  packageId: string,
  version: string,
  direction: "up" | "down",
): Promise<number> {
  const files = (await readPackageSqlFiles(packageId)).filter((file) => file.direction === direction);
  const ordered = direction === "down" ? [...files].reverse() : files;
  const applied = await prisma.packageMigration.findMany({
    where: { packageId, direction },
    select: { filename: true, checksum: true },
  });
  const seen = new Map(applied.map((row) => [row.filename, row.checksum]));
  let count = 0;
  for (const file of ordered) {
    if (direction === "up" && seen.get(file.filename) === file.checksum) continue;
    if (direction === "down" && !seen.has(file.filename.replace(/\.down\.sql$/, ".up.sql")) && !seen.has(file.filename)) {
      continue;
    }
    const statements = sqlStatements(file.sql);
    await prisma.$transaction(async (tx) => {
      for (const statement of statements) {
        await tx.$executeRawUnsafe(statement);
      }
      if (direction === "up") {
        await tx.packageMigration.create({
          data: {
            packageId,
            version,
            filename: file.filename,
            checksum: file.checksum,
            direction,
          },
        });
      } else {
        await tx.packageMigration.deleteMany({
          where: { packageId, filename: file.filename },
        });
      }
    });
    count += 1;
  }
  return count;
}
