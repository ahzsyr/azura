import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { navigationService } from "@/features/navigation/navigation.service";
import { stripInlineImagesFromBranding } from "@/features/navigation/workspace-transport";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await navigationService.getWorkspace();
  const branding = stripInlineImagesFromBranding(workspace.branding);
  return NextResponse.json({
    menusDatabase: workspace.menusDatabase,
    activeMenuKey: workspace.activeMenuKey,
    brandingState: branding,
    headerActions: workspace.headerActions,
    settings: workspace.settings,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    await navigationService.saveWorkspace(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
