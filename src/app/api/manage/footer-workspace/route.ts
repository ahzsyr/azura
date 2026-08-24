import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { footerService } from "@/features/footer/footer.service";

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async () => {
    const workspace = await footerService.getWorkspace();
    return NextResponse.json(workspace);
  },
});

export const PATCH = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => {
    try {
      const body = (await request.json()) as { changes?: Record<string, unknown> };
      if (!body.changes || typeof body.changes !== "object") {
        return NextResponse.json({ error: "Missing changes" }, { status: 400 });
      }
      await footerService.patchWorkspace(body.changes);
      return NextResponse.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
});

export const POST = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => {
    try {
      const body = await request.json();
      await footerService.saveWorkspace(body);
      return NextResponse.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
});
