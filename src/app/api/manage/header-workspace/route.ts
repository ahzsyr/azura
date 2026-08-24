import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { navigationService } from "@/features/navigation/navigation.service";
import { stripInlineImagesFromBranding } from "@/features/navigation/workspace-transport";

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale")?.trim() || "en";
    const workspace = await navigationService.getWorkspaceForBuilder(locale);
    const branding = stripInlineImagesFromBranding(workspace.branding);
    return NextResponse.json({
      menusDatabase: workspace.menusDatabase,
      activeMenuKey: workspace.activeMenuKey,
      brandingState: branding,
      headerActions: workspace.headerActions,
      settings: workspace.settings,
    });
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
      await navigationService.patchWorkspace(body.changes);
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
      await navigationService.saveWorkspace(body);
      return NextResponse.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
});
