import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { productsApiService } from "@/features/products/products-api.service";

function jsonFromResult(result: Record<string, unknown>) {
  if ("status" in result && typeof result.status === "number") {
    const { status, error, ...rest } = result;
    return NextResponse.json(
      error ? { error, ...rest } : rest,
      { status },
    );
  }
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  try {
    return jsonFromResult(await productsApiService.getProducts(url));
  } catch (e) {
    if (e instanceof Error && e.message === "Invalid locale") {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed loading products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Parameters<typeof productsApiService.createProduct>[0];
    return jsonFromResult(await productsApiService.createProduct(body));
  } catch (e) {
    if (e instanceof Error && e.message === "Invalid locale") {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const body = (await request.json()) as Parameters<typeof productsApiService.patchProduct>[1];
    return jsonFromResult(await productsApiService.patchProduct(url, body));
  } catch (e) {
    if (e instanceof Error && e.message === "Invalid locale") {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Patch failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    return jsonFromResult(await productsApiService.deleteProduct(url));
  } catch (e) {
    if (e instanceof Error && e.message === "Invalid locale") {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
