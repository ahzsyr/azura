import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";
import { mediaRepository } from "@/repositories/media.repository";
import { updateAllCmsMediaReferences } from "@/features/media/cms-media-references";
import { resolveMediaType } from "@/lib/local-media-storage";
import { z } from "zod";
import { deleteStoredAsset } from "@/lib/media-storage";
import { revalidateMarketingHome } from "@/services/cache";

const replaceSchema = z.object({
  id: z.string().min(1),
  /**
   * Media assets are typically stored as local public URLs like `/uploads/images/...`.
   * Allow either absolute URLs or local-root relative URLs.
   */
  url: z.string().refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
    message: 'url must be an absolute URL or start with "/"',
  }),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().optional(),
  filename: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = replaceSchema.parse(body);
    const existing = await mediaRepository.getAsset(parsed.id);
    if (!existing) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    const filename = parsed.filename ?? existing.filename;
    const mime = parsed.mimeType ?? existing.mimeType;
    const asset = await mediaRepository.updateAsset(parsed.id, {
      url: parsed.url,
      sizeBytes: parsed.sizeBytes,
      mimeType: mime,
      mediaType: resolveMediaType(filename, mime),
      filename,
    });

    if (existing.url !== asset.url) {
      await updateAllCmsMediaReferences(existing.url, asset.url);
    }

    if (existing.url !== asset.url && existing.objectKey) {
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
      id: asset.id,
      url: asset.url,
      previousUrl: existing.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
