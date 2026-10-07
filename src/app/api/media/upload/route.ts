import { NextResponse } from "next/server";
import type { MediaType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";
import { mediaRepository } from "@/repositories/media.repository";
import { persistMediaUpload } from "@/features/media/persist-upload";
import { updateAllCmsMediaReferences } from "@/features/media/cms-media-references";
import { deleteStoredAsset, storeUploadedFile } from "@/lib/media-storage";
import { mimeTypeForUpload, validateUploadFile } from "@/lib/local-media-storage";
import { revalidateMarketingHome } from "@/services/cache";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const expectedTypeRaw = formData.get("mediaType");
    const expectedType =
      typeof expectedTypeRaw === "string" && expectedTypeRaw.length > 0
        ? (expectedTypeRaw as MediaType)
        : undefined;
    const folderIdRaw = formData.get("folderId");
    const folderId = typeof folderIdRaw === "string" && folderIdRaw.length > 0 ? folderIdRaw : null;
    const replaceIdRaw = formData.get("replaceId");
    const replaceId = typeof replaceIdRaw === "string" && replaceIdRaw.length > 0 ? replaceIdRaw : null;

    const validation = validateUploadFile(file, expectedType);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { mediaType } = validation;
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeUploadedFile(file, buffer, mediaType);
    const url = stored.url;
    const mimeType = mimeTypeForUpload(file.name, file.type, mediaType);

    if (replaceId) {
      const existing = await mediaRepository.getAsset(replaceId);
      if (!existing) {
        return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
      }

      const previousUrl = existing.url;

      await mediaRepository.updateAsset(replaceId, {
        url,
        sizeBytes: file.size,
        mimeType,
        mediaType,
        filename: file.name,
        storageBackend: stored.storage,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
      });

      if (previousUrl !== url) {
        await updateAllCmsMediaReferences(previousUrl, url);
      }

      if (
        existing.objectKey &&
        (existing.storageBackend !== stored.storage ||
          existing.bucket !== stored.bucket ||
          existing.objectKey !== stored.objectKey)
      ) {
        await deleteStoredAsset({
          storageBackend: existing.storageBackend,
          bucket: existing.bucket,
          objectKey: existing.objectKey,
        });
      }

      revalidatePath("/admin/media");
      revalidatePath("/", "layout");
      revalidateMarketingHome();

      return NextResponse.json({
        ok: true,
        id: replaceId,
        url,
        mediaType,
      });
    }

    const asset = await persistMediaUpload({
      filename: file.name,
      url,
      mimeType,
      mediaType,
      sizeBytes: file.size,
      folderId,
      uploadedById: session.user.id,
      uploaderEmail: session.user.email,
      storageBackend: stored.storage,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
    });


    return NextResponse.json({
      ok: true,
      id: asset.id,
      url: asset.url,
      mediaType,
    });
  } catch (error) {
    console.error("[media/upload]", error);
    const message =
      error instanceof Error && error.message.includes("MediaAsset")
        ? "Could not save media record. Try signing out and back in."
        : error instanceof Error
          ? error.message
          : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
