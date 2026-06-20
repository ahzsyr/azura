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
  filenameFromStoredUrl,
} from "@/features/media/fs/media-library.service";
import { updateAllCatalogReferences } from "@/features/media/fs/catalog-media-references";
import { catalogExtToCmsMediaType } from "@/features/media/lib/media-type-map";
import { deleteStoredUpload, storeUploadedFile, useRemoteMediaStorage } from "@/lib/media-storage";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { mediaRepository } from "@/repositories/media.repository";

async function replaceRemoteAsset(params: {
  file: File;
  oldFilename: string;
  oldUrl: string;
  newExt: string;
  type: ReturnType<typeof getMediaType>;
}) {
  const { file, oldFilename, oldUrl, newExt, type } = params;
  const buffer = Buffer.from(await file.arrayBuffer());
  const cmsType = catalogExtToCmsMediaType(newExt);
  const stored = await storeUploadedFile(
    { name: file.name, type: file.type || "application/octet-stream" },
    buffer,
    cmsType,
  );
  const newFilename = filenameFromStoredUrl(stored.url);
  const newUrl = stored.url;

  if (oldUrl) await deleteStoredUpload(oldUrl);

  const { updatedProducts, updatedCollections } = await updateAllCatalogReferences(oldUrl, newUrl);

  if (useDatabaseOnlyCatalog() || isCloudNativeProduction()) {
    const assets = await mediaRepository.listAssets({ assetScope: "CATALOG" });
    const match =
      assets.find((a) => a.filename === oldFilename || a.url.endsWith(`/${oldFilename}`)) ??
      assets.find((a) => a.id === oldFilename);
    if (match) {
      await mediaRepository.updateAsset(match.id, {
        url: newUrl,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        mediaType: cmsType,
        sizeBytes: file.size,
      });
    }
  } else {
    const meta = await readMeta();
    const now = new Date().toISOString();
    const oldEntry = meta[oldFilename];
    delete meta[oldFilename];
    meta[newFilename] = {
      ...(oldEntry ?? { id: newFilename, originalName: file.name, uploadedAt: now }),
      id: newFilename,
      originalName: file.name,
      uploadedAt: now,
      url: newUrl,
      size: file.size,
      ext: newExt,
      type,
    };
    await writeMeta(meta);
  }

  return { newUrl, newFilename, updatedProducts, updatedCollections };
}

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

    const newExt = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(newExt)) {
      return NextResponse.json({ error: `File type "${newExt}" is not allowed` }, { status: 400 });
    }

    const maxSize = MAX_SIZES[newExt] ?? DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    let oldUrl = "";
    if (useDatabaseOnlyCatalog() || isCloudNativeProduction()) {
      const assets = await mediaRepository.listAssets({ assetScope: "CATALOG" });
      const match =
        assets.find((a) => a.filename === oldFilename || a.url.endsWith(`/${oldFilename}`)) ??
        assets.find((a) => a.id === oldFilename);
      if (!match) {
        return NextResponse.json({ error: "Original file not found" }, { status: 404 });
      }
      oldUrl = match.url;
    } else {
      const meta = await readMeta();
      const fsFiles = await scanFilesystem();
      const found = fsFiles.find((f) => f.filename === oldFilename);
      const oldEntry = meta[oldFilename];
      if (!found && !oldEntry) {
        return NextResponse.json({ error: "Original file not found" }, { status: 404 });
      }
      oldUrl = oldEntry?.url ?? found?.url ?? "";
    }

    const type = getMediaType(newExt);

    if (isCloudNativeProduction() && !useRemoteMediaStorage()) {
      return NextResponse.json(
        { error: "Cloud-native mode requires Supabase Storage." },
        { status: 503 },
      );
    }

    if (useRemoteMediaStorage()) {
      const { newUrl, newFilename, updatedProducts, updatedCollections } = await replaceRemoteAsset({
        file,
        oldFilename,
        oldUrl,
        newExt,
        type,
      });

      if (updatedProducts > 0) {
        try {
          const { catalogSyncOrchestrator } = await import(
            "@/features/catalog/sync/catalog-sync-orchestrator"
          );
          const { adminLocale } = await import("@/features/catalog/admin/catalog-admin-config");
          await catalogSyncOrchestrator.onBulkImportComplete([adminLocale.code]);
        } catch (e) {
          console.warn("[catalog-media] index sync after reference update failed", e);
        }
      }

      return NextResponse.json({
        newUrl,
        oldUrl,
        newFilename,
        updatedProducts,
        updatedPages: 0,
        updatedCollections,
      });
    }

    const meta = await readMeta();
    const fsFiles = await scanFilesystem();
    const found = fsFiles.find((f) => f.filename === oldFilename);
    const oldEntry = meta[oldFilename];
    const oldExt = found?.ext ?? oldEntry?.ext ?? extname(oldFilename).toLowerCase();
    const subDir = found?.subDir ?? getSubDir(type);
    const newFilename =
      newExt === oldExt ? oldFilename : `${Date.now()}-${safeFilename(file.name)}`;

    const dir = resolve(process.cwd(), `public/uploads/${subDir}`);
    await mkdir(dir, { recursive: true });
    const newPath = join(dir, newFilename);
    await writeFile(newPath, Buffer.from(await file.arrayBuffer()));

    if (newFilename !== oldFilename && found) {
      await unlink(resolve(dir, oldFilename));
    }

    const newUrl = `/uploads/${subDir}/${newFilename}`;
    const { updatedProducts, updatedCollections } = await updateAllCatalogReferences(oldUrl, newUrl);

    if (updatedProducts > 0) {
      try {
        const { catalogSyncOrchestrator } = await import(
          "@/features/catalog/sync/catalog-sync-orchestrator"
        );
        const { adminLocale } = await import("@/features/catalog/admin/catalog-admin-config");
        await catalogSyncOrchestrator.onBulkImportComplete([adminLocale.code]);
      } catch (e) {
        console.warn("[catalog-media] index sync after reference update failed", e);
      }
    }

    if (meta[oldFilename]) {
      const now = new Date().toISOString();
      meta[newFilename] = {
        ...meta[oldFilename],
        id: newFilename,
        originalName: file.name,
        uploadedAt: now,
        url: newUrl,
        size: file.size,
        ext: newExt,
        type,
      };
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
