import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/features/account/favorites.service";
import { favoriteToggleSchema } from "@/features/account/favorites.schema";

export const GET = defineApiRoute({
  access: "customer",
  async handler({ session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const favorites = await listFavorites(session.user.id);
    return NextResponse.json({ favorites });
  },
});

export const POST = defineApiRoute({
  access: "customer",
  async handler({ request, session }) {
    if (!session?.user?.id) {
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
  },
});

export const DELETE = defineApiRoute({
  access: "customer",
  async handler({ request, session }) {
    if (!session?.user?.id) {
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
  },
});
