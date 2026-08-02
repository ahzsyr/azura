import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { footerService } from "@/features/footer/footer.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspace = await footerService.getWorkspace();
  return NextResponse.json(workspace);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    await footerService.saveWorkspace(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
