import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import {
  normalizeVisitorToken,
  visitorLinkSessionError,
} from "@/features/account/admin/visitor-link-policy";
import { linkVisitorTokenToUser } from "@/features/account/admin/visitor-link.service";

export const POST = defineApiRoute({
  access: "public",
  async handler({ request, session }) {
    const userId = session?.user?.id ?? "";
    if (visitorLinkSessionError(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { visitorToken?: unknown };
    const token = normalizeVisitorToken(body?.visitorToken);
    if (!token) {
      return NextResponse.json({ error: "Invalid visitor" }, { status: 400 });
    }
    const result = await linkVisitorTokenToUser(userId, token);
    return NextResponse.json({ success: true, linked: result.linked });
  },
});
