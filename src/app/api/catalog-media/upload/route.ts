import { NextResponse } from "next/server";
import { extname } from "node:path";
import {
  ALLOWED_EXTS,
  MAX_SIZES,
  DEFAULT_MAX_SIZE,
  getMediaType,
  safeFilename,
  filenameFromStoredUrl,
} from "@/features/media/fs/media-library.service";
import { catalogExtToCmsMediaType } from "@/features/media/lib/media-type-map";
import { storeUploadedFile, useRemoteMediaStorage } from "@/lib/media-storage";
import { persistMediaUpload } from "@/features/media/persist-upload";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { auth } from "@/lib/auth";

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const cmsType = catalogExtToCmsMediaType(ext);

    if (!useRemoteMediaStorage() && isCloudNativeProduction()) {
      return NextResponse.json(
        { error: "Cloud-native mode requires Supabase Storage for uploads." },
        { status: 503 },
      );
    }

    const stored = await storeUploadedFile(
      { name: file.name, type: file.type || "application/octet-stream" },
      buffer,
      cmsType,
    );

    const filename = filenameFromStoredUrl(stored.url) || `${Date.now()}-${safeFilename(file.name)}`;
    const session = await auth();
    const asset = await persistMediaUpload({
      filename: file.name,
      url: stored.url,
      mimeType: file.type || "application/octet-stream",
      mediaType: cmsType,
      sizeBytes: file.size,
      uploadedById: session?.user?.id,
      uploaderEmail: session?.user?.email,
      assetScope: "CATALOG",
    });

    return NextResponse.json({
      item: {
        id: asset.id,
        filename,
        originalName: file.name,
        url: stored.url,
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
