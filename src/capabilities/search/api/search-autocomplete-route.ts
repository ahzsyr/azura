import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";
import { handleSearchAutocomplete } from "@/capabilities/search/api/search-autocomplete-handler";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";

type AutocompleteRouteOptions = {
  requireAuth: boolean;
  includeAdmin: boolean;
  defaultLocale?: string;
};

export function createSearchAutocompleteRoute(options: AutocompleteRouteOptions) {
  const defaultLocale = options.defaultLocale ?? (options.includeAdmin ? adminLocale.code : "en");

  return async function GET(request: NextRequest) {
    if (options.requireAuth) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = request.nextUrl;
    const locale = searchParams.get("locale") ?? defaultLocale;
    const admin = await ensureSearchRuntimeConfig(locale);

    const payload = await handleSearchAutocomplete(admin, {
      q: (searchParams.get("q") ?? "").trim(),
      locale,
      types: searchParams.get("types"),
      contentTypeSlugs: searchParams.get("contentTypeSlugs"),
      kinds: searchParams.get("kinds"),
      facets: searchParams.get("facets"),
      includeAdmin: options.includeAdmin || undefined,
    });

    return NextResponse.json(payload);
  };
}
