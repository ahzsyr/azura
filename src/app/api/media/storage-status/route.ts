import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMediaStorageStatus } from "@/lib/media-storage";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getMediaStorageStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
