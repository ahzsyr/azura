import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/features/account/favorites.service";
import { favoriteToggleSchema } from "@/features/account/favorites.schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const favorites = await listFavorites(session.user.id);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const data = favoriteToggleSchema.parse(body);
    await addFavorite(session.user.id, data.entityType, data.entityId, data.locale);
    return NextResponse.json({ success: true, saved: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const data = favoriteToggleSchema.parse(body);
    await removeFavorite(session.user.id, data.entityType, data.entityId);
    return NextResponse.json({ success: true, saved: false });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
