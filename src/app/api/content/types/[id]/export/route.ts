import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { exportContentType } from "@/features/content/content-type-import-export.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const payload = await exportContentType(id);
    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="${payload.contentType.slug}-export.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: e instanceof Error && e.message.includes("not found") ? 404 : 500 },
    );
  }
}
