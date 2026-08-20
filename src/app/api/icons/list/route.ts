import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchIcons } from "@/features/icons/actions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const sourceRaw = url.searchParams.get("source");
  const source =
    sourceRaw === "BUILTIN" || sourceRaw === "CUSTOM" || sourceRaw === "FONT"
      ? sourceRaw
      : "ALL";

  try {
    const icons = await fetchIcons({ search, source });
    return NextResponse.json({ icons });
  } catch (error) {
    console.error("[icons/list]", error);
    return NextResponse.json({ error: "Failed to list icons" }, { status: 500 });
  }
}
