import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { navigationCatalogService } from "@/features/navigation/navigation.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "en";

  const catalog = await navigationCatalogService.getCatalog(locale);
  return NextResponse.json(catalog);
}
