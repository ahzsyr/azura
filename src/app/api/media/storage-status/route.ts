import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";
import { getMediaStorageStatus } from "@/lib/media-storage";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getMediaStorageStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
