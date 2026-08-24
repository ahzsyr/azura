import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { getAccountRequestDetail } from "@/features/account/account-requests.service";

export const GET = defineApiRoute({
  access: "customer",
  async handler({ request, context, session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await context.params;
    const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
    if (!id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { searchParams } = new URL(request.url);
    const kindParam = searchParams.get("kind");
    const kind = kindParam === "quote" ? "quote" : "inquiry";
    const detail = await getAccountRequestDetail({
      userId: session.user.id,
      userEmail: session.user.email ?? "",
      id,
      kind,
    });
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ request: detail });
  },
});
