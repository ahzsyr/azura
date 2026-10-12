import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { writeDatabaseSqlDump, writeSiteBackupZip } from "@/features/setup/site-backup.service";
import { StoreZipWriter } from "@/features/setup/store-zip";

export const dynamic = "force-dynamic";

export const POST = defineApiRoute({
  access: "super_admin",
  handler: async () => {
    const dir = await mkdtemp(join(tmpdir(), "azura-backup-"));
    const sqlPath = join(dir, "database.sql");
    try {
      await writeDatabaseSqlDump(sqlPath);
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      const message = error instanceof Error ? error.message : "Backup failed";
      console.error("[site-backup] database dump failed:", message);
      return NextResponse.json({ error: "Could not create the database backup." }, { status: 500 });
    }

    const pass = new PassThrough();
    const zip = new StoreZipWriter(pass);
    void writeSiteBackupZip(zip, sqlPath)
      .catch((error) => {
        console.error("[site-backup] zip failed:", error);
        pass.destroy(error instanceof Error ? error : new Error("Backup failed"));
      })
      .finally(() => {
        void rm(dir, { recursive: true, force: true });
      });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return new Response(Readable.toWeb(pass) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="azura-backup-${stamp}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  },
});
