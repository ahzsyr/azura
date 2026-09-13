import { NextResponse } from "next/server";
import { deleteCatalogMediaFile } from "@/features/media/fs/media-library.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { action?: string; filenames?: string[] };
  if (body.action !== "delete" || !Array.isArray(body.filenames)) {
    return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 });
  }

  const deleted: string[] = [];
  const failed: string[] = [];
  const tombstoned: string[] = [];

  for (const filename of body.filenames) {
    const result = await deleteCatalogMediaFile(filename);
    if (result.ok) {
      deleted.push(filename);
      if (result.tombstoned) tombstoned.push(filename);
    } else {
      failed.push(filename);
    }
  }

  return NextResponse.json({ deleted, failed, tombstoned });
}
