import { NextResponse } from "next/server";
import { collectionsApiService } from "@/features/collections/collections-api.service";
import { defineApiRoute } from "@/lib/api-auth";

function jsonFromResult(result: Record<string, unknown>) {
  if ("status" in result && typeof result.status === "number") {
    const { status, error, ...rest } = result;
    return NextResponse.json(error ? { error, ...rest } : rest, { status });
  }
  return NextResponse.json(result);
}

export const GET = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async () => {
    return NextResponse.json(await collectionsApiService.listCollections());
  },
});

export const POST = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      return jsonFromResult(await collectionsApiService.handlePost(body));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Create failed" },
        { status: 400 },
      );
    }
  },
});

export const PUT = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
    try {
      const body = (await request.json()) as Parameters<typeof collectionsApiService.updateCollection>[0];
      return jsonFromResult(await collectionsApiService.updateCollection(body));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Update failed" },
        { status: 400 },
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
      const body = (await request.json()) as Parameters<typeof collectionsApiService.patchCollection>[0];
      return jsonFromResult(await collectionsApiService.patchCollection(body));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Patch failed" },
        { status: 400 },
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
      const body = (await request.json()) as Parameters<typeof collectionsApiService.deleteCollection>[0];
      return jsonFromResult(await collectionsApiService.deleteCollection(body));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Delete failed" },
        { status: 400 },
      );
    }
  },
});
