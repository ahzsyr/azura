import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { handleSearchAutocomplete } from "@/features/search/api/search-autocomplete-handler";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const locale = searchParams.get("locale") ?? "en";
  const admin = await ensureSearchRuntimeConfig(locale);

  const payload = await handleSearchAutocomplete(admin, {
    q: (searchParams.get("q") ?? "").trim(),
    locale,
    types: searchParams.get("types"),
    contentTypeSlugs: searchParams.get("contentTypeSlugs"),
    kinds: searchParams.get("kinds"),
    facets: searchParams.get("facets"),
    includeAdmin: true,
  });

  return NextResponse.json(payload);
}
