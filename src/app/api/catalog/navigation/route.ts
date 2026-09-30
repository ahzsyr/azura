import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  deleteCatalogNavigation,
  listCatalogNavigations,
  saveCatalogNavigation,
} from "@/features/catalog/navigation/repository";
import { catalogNavigationSchema } from "@/features/catalog/navigation/schema";
import type { CatalogNavigationScopeType } from "@/features/catalog/navigation/types";

export async function GET() {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const navigations = await listCatalogNavigations();
    return NextResponse.json({ navigations });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load navigation" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { navigation?: unknown };
    const parsed = catalogNavigationSchema.safeParse(body.navigation);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid navigation payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const navigation = await saveCatalogNavigation(parsed.data);
    return NextResponse.json({ navigation });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save navigation" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const scopeType = String(url.searchParams.get("scopeType") || "GLOBAL") as CatalogNavigationScopeType;
    const scopeIdRaw = url.searchParams.get("scopeId");
    const scopeId = scopeIdRaw && scopeIdRaw.length ? scopeIdRaw : null;
    await deleteCatalogNavigation(scopeType, scopeId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete navigation" },
      { status: 500 },
    );
  }
}
