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
  filenameFromStoredUrl,
} from "@/features/media/fs/media-library.service";
import { catalogExtToCmsMediaType } from "@/features/media/lib/media-type-map";
import { storeUploadedFile, useRemoteMediaStorage } from "@/lib/media-storage";
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

    const type = getMediaType(ext);
    const now = new Date().toISOString();
    const meta = await readMeta();

    if (useRemoteMediaStorage()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const cmsType = catalogExtToCmsMediaType(ext);
      const stored = await storeUploadedFile(
        { name: file.name, type: file.type || "application/octet-stream" },
        buffer,
        cmsType,
      );
      const filename = filenameFromStoredUrl(stored.url);
      meta[filename] = {
        id: filename,
        originalName: file.name,
        uploadedAt: now,
        url: stored.url,
        size: file.size,
        ext,
        type,
      };
      await writeMeta(meta);

      return NextResponse.json({
        item: {
          id: filename,
          filename,
          originalName: file.name,
          url: stored.url,
          type,
          ext,
          size: file.size,
          uploadedAt: now,
        },
      });
    }

    const filename = `${Date.now()}-${safeFilename(file.name)}`;
    const subDir = getSubDir(type);
    const dir = resolve(process.cwd(), `public/uploads/${subDir}`);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, filename), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/${subDir}/${filename}`;
    meta[filename] = {
      id: filename,
      originalName: file.name,
      uploadedAt: now,
      url,
      size: file.size,
      ext,
      type,
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
