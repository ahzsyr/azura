import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
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

export const GET = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
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
  },
});

export const POST = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
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
  },
});

export const PATCH = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
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
  },
});

export const DELETE = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
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
  },
});
