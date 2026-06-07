import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { readMeta, writeMeta, scanFilesystem } from "@/features/media/fs/media-library.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { action?: string; filenames?: string[] };
  if (body.action !== "delete" || !Array.isArray(body.filenames)) {
    return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 });
  }

  const fsFiles = await scanFilesystem();
  const meta = await readMeta();
  let deleted = 0;

  for (const filename of body.filenames) {
    const found = fsFiles.find((f) => f.filename === filename);
    if (found) {
      await unlink(resolve(process.cwd(), `public/uploads/${found.subDir}/${filename}`));
      deleted++;
    }
    delete meta[filename];
  }

  await writeMeta(meta);
  return NextResponse.json({ deleted });
}
