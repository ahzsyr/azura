import { NextResponse } from "next/server";
import {
  buildMediaItems,
  readMeta,
  writeMeta,
  scanFilesystem,
  deleteCatalogMediaFile,
} from "@/features/media/fs/media-library.service";
import type { MediaSortField, MediaType } from "@/features/media/fs/types";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { rename } from "node:fs/promises";
import { resolve } from "node:path";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const sp = new URL(request.url).searchParams;
  const typeFilter = (sp.get("type") ?? "all") as MediaType | "all";
  const search = (sp.get("search") ?? "").toLowerCase().trim();
  const sort = (sp.get("sort") ?? "date") as MediaSortField;
  const dir = sp.get("dir") ?? "desc";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "48", 10)));
  const tags = sp.get("tags") ? sp.get("tags")!.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const meta = await readMeta();
  let items = await buildMediaItems(meta);

  if (typeFilter !== "all") items = items.filter((i) => i.type === typeFilter);
  if (search) {
    items = items.filter(
      (i) =>
        i.filename.toLowerCase().includes(search) ||
        (i.originalName ?? "").toLowerCase().includes(search) ||
        (i.title ?? "").toLowerCase().includes(search) ||
        (i.alt ?? "").toLowerCase().includes(search) ||
        (i.tags ?? []).some((t) => t.toLowerCase().includes(search)),
    );
  }
  if (tags.length > 0) {
    items = items.filter((i) => tags.every((t) => (i.tags ?? []).includes(t)));
  }

  items.sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "date":
        cmp = a.uploadedAt.localeCompare(b.uploadedAt);
        break;
      case "name":
        cmp = a.filename.localeCompare(b.filename);
        break;
      case "size":
        cmp = a.size - b.size;
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
      default:
        cmp = a.uploadedAt.localeCompare(b.uploadedAt);
    }
    return dir === "asc" ? cmp : -cmp;
  });

  const total = items.length;
  const start = (page - 1) * limit;
  return NextResponse.json({ items: items.slice(start, start + limit), total, page, pageSize: limit });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    filename: string;
    title?: string;
    alt?: string;
    description?: string;
    tags?: string[];
    newFilename?: string;
  };
  if (!body.filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const meta = await readMeta();
  const { filename, newFilename, title, alt, description, tags } = body;

  if (newFilename && newFilename !== filename) {
    const fsFiles = await scanFilesystem();
    const found = fsFiles.find((f) => f.filename === filename);
    if (!found) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
    const oldPath = resolve(process.cwd(), `public/uploads/${found.subDir}/${filename}`);
    const newPath = resolve(process.cwd(), `public/uploads/${found.subDir}/${newFilename}`);
    await rename(oldPath, newPath);
    if (meta[filename]) {
      meta[newFilename] = { ...meta[filename], id: newFilename };
      delete meta[filename];
    }
  }

  const key = newFilename ?? filename;
  meta[key] = {
    ...(meta[key] ?? { id: key, originalName: key, uploadedAt: new Date().toISOString() }),
    ...(title !== undefined ? { title } : {}),
    ...(alt !== undefined ? { alt } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(tags !== undefined ? { tags } : {}),
  };
  await writeMeta(meta);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const sp = new URL(request.url).searchParams;
  const filename = sp.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const result = await deleteCatalogMediaFile(filename);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, tombstoned: result.tombstoned ?? false });
}
