import { NextResponse } from "next/server";
import { queryListingRecordsByIdentifiers } from "@/features/products/listing/query-listing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const slugsParam = url.searchParams.get("slugs")?.trim() || "";
  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json({ records: [] });
  }

  try {
    const records = await queryListingRecordsByIdentifiers(
      locale,
      slugs.map((slug) => ({ slug })),
    );
    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load records" },
      { status: 500 },
    );
  }
}
