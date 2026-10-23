import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { deleteIconAsset } from "@/features/icons/actions";

export const DELETE = defineApiRoute({
  access: "admin",
  handler: async ({ request }) => {
    const url = new URL(request.url);
    const iconId = url.searchParams.get("iconId");
    if (!iconId) {
      return NextResponse.json({ error: "iconId is required" }, { status: 400 });
    }

    try {
      const result = await deleteIconAsset(iconId);
      if (!result.success) {
        return NextResponse.json({ error: result.error ?? "Delete failed" }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("[icons/delete]", error instanceof Error ? error.name : "unknown");
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  },
});
