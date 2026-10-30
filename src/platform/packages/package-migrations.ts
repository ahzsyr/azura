import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { sqlStatements, upFilenameForDown } from "@/platform/packages/package-migration-sql";

export type PackageSqlFile = {
  filename: string;
  direction: "up" | "down";
  sql: string;
  checksum: string;
};

export class PackageMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackageMigrationError";
  }
}

export { sqlStatements, upFilenameForDown };

function checksumOf(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function packageMigrationsDir(packageId: string): string {
  return path.join(process.cwd(), "src", "modules", packageId, "migrations");
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

/**
 * Apply allowlisted ship-time SQL for a package.
 * - up: skip when filename+checksum match; refuse checksum mismatch on same filename.
 * - down: eligible only when the corresponding **up** ledger row exists; after success, delete that up row.
 */
export async function applyPackageSql(
  packageId: string,
  version: string,
  direction: "up" | "down",
): Promise<number> {
  const files = (await readPackageSqlFiles(packageId)).filter((file) => file.direction === direction);
  const ordered = direction === "down" ? [...files].reverse() : files;
  const upLedger = await prisma.packageMigration.findMany({
    where: { packageId, direction: "up" },
    select: { filename: true, checksum: true },
  });
  const upByName = new Map(upLedger.map((row) => [row.filename, row.checksum]));
  let count = 0;
  for (const file of ordered) {
    if (direction === "up") {
      const prior = upByName.get(file.filename);
      if (prior === file.checksum) continue;
      if (prior != null && prior !== file.checksum) {
        throw new PackageMigrationError(
          `${packageId} migration ${file.filename} checksum mismatch (refusing to re-apply; recorded ${prior.slice(0, 8)}… vs ${file.checksum.slice(0, 8)}…)`,
        );
      }
    } else {
      const upName = upFilenameForDown(file.filename);
      if (!upByName.has(upName)) continue;
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
        const upName = upFilenameForDown(file.filename);
        await tx.packageMigration.deleteMany({
          where: { packageId, filename: upName, direction: "up" },
        });
      }
    });
    if (direction === "up") upByName.set(file.filename, file.checksum);
    else upByName.delete(upFilenameForDown(file.filename));
    count += 1;
  }
  return count;
}
