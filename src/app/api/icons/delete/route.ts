import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteIconAsset } from "@/features/icons/actions";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    console.error("[icons/delete]", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
