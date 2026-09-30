import { NextResponse } from "next/server";
import { findCatalogMediaUsages } from "@/features/media/fs/catalog-media-references";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const filename = new URL(request.url).searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const usages = await findCatalogMediaUsages(filename);
  return NextResponse.json({ filename, usages });
}
