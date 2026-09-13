import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { listAccountRequests } from "@/features/account/account-requests.service";

export const GET = defineApiRoute({
  access: "customer",
  async handler({ request, session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const skip = Math.max(Number(searchParams.get("offset") ?? 0), 0);
    const result = await listAccountRequests({
      userId: session.user.id,
      userEmail: session.user.email ?? "",
      take,
      skip,
    });
    return NextResponse.json(result);
  },
});
