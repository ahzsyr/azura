import { writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { NextResponse } from "next/server";
import {
  ALLOWED_EXTS,
  MAX_SIZES,
  DEFAULT_MAX_SIZE,
  getMediaType,
  getSubDir,
  safeFilename,
  readMeta,
  writeMeta,
  scanFilesystem,
} from "@/features/media/fs/media-library.service";
import { updateAllCatalogReferences } from "@/features/media/fs/catalog-media-references";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const oldFilename = formData.get("filename");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No replacement file provided" }, { status: 400 });
    }
    if (typeof oldFilename !== "string" || !oldFilename) {
      return NextResponse.json({ error: "Original filename required" }, { status: 400 });
    }

    const fsFiles = await scanFilesystem();
    const found = fsFiles.find((f) => f.filename === oldFilename);
    if (!found) {
      return NextResponse.json({ error: "Original file not found" }, { status: 404 });
    }

    const newExt = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(newExt)) {
      return NextResponse.json({ error: `File type "${newExt}" is not allowed` }, { status: 400 });
    }

    const oldUrl = found.url;
    const subDir = found.subDir;
    const newFilename =
      newExt === found.ext
        ? oldFilename
        : `${Date.now()}-${safeFilename(file.name)}`;

    const dir = resolve(process.cwd(), `public/uploads/${subDir}`);
    await mkdir(dir, { recursive: true });
    const newPath = join(dir, newFilename);
    await writeFile(newPath, Buffer.from(await file.arrayBuffer()));

    if (newFilename !== oldFilename) {
      await unlink(resolve(dir, oldFilename));
    }

    const newUrl = `/uploads/${subDir}/${newFilename}`;
    const { updatedProducts, updatedCollections } = await updateAllCatalogReferences(
      oldUrl,
      newUrl,
    );

    const meta = await readMeta();
    if (meta[oldFilename]) {
      meta[newFilename] = { ...meta[oldFilename], id: newFilename };
      if (newFilename !== oldFilename) delete meta[oldFilename];
      await writeMeta(meta);
    }

    return NextResponse.json({
      newUrl,
      oldUrl,
      newFilename,
      updatedProducts,
      updatedPages: 0,
      updatedCollections,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Replace failed" },
      { status: 500 },
    );
  }
}
