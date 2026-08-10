import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mergeFavorites } from "@/features/account/favorites.service";
import { favoriteMergeSchema } from "@/features/account/favorites.schema";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const data = favoriteMergeSchema.parse(body);
    const items = [
      ...data.products.map((entityId) => ({
        entityType: "CATALOG_PRODUCT" as const,
        entityId,
        locale: data.locale,
      })),
      ...data.contentItems.map((entityId) => ({
        entityType: "CONTENT_ITEM" as const,
        entityId,
        locale: data.locale,
      })),
    ];
    const result = await mergeFavorites(session.user.id, items);
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
