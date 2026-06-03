import { writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
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
} from "@/features/media/fs/media-library.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ error: `File type "${ext}" is not allowed` }, { status: 400 });
    }

    const maxSize = MAX_SIZES[ext] ?? DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large` }, { status: 400 });
    }

    const filename = `${Date.now()}-${safeFilename(file.name)}`;
    const type = getMediaType(ext);
    const subDir = getSubDir(type);
    const dir = resolve(process.cwd(), `public/uploads/${subDir}`);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, filename), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/${subDir}/${filename}`;
    const now = new Date().toISOString();
    const meta = await readMeta();
    meta[filename] = {
      id: filename,
      originalName: file.name,
      uploadedAt: now,
    };
    await writeMeta(meta);

    return NextResponse.json({
      item: {
        id: filename,
        filename,
        originalName: file.name,
        url,
        type,
        ext,
        size: file.size,
        uploadedAt: now,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
