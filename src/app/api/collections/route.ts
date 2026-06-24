import { NextResponse } from "next/server";
import { collectionsApiService } from "@/features/collections/collections-api.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

function jsonFromResult(result: Record<string, unknown>) {
  if ("status" in result && typeof result.status === "number") {
    const { status, error, ...rest } = result;
    return NextResponse.json(error ? { error, ...rest } : rest, { status });
  }
  return NextResponse.json(result);
}

export async function GET() {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await collectionsApiService.listCollections());
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    return jsonFromResult(await collectionsApiService.handlePost(body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Parameters<typeof collectionsApiService.updateCollection>[0];
    return jsonFromResult(await collectionsApiService.updateCollection(body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Parameters<typeof collectionsApiService.patchCollection>[0];
    return jsonFromResult(await collectionsApiService.patchCollection(body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Patch failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Parameters<typeof collectionsApiService.deleteCollection>[0];
    return jsonFromResult(await collectionsApiService.deleteCollection(body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 400 },
    );
  }
}
