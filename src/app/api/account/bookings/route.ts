import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { listAccountBookings } from "@/features/account/account-portal.service";

export const GET = defineApiRoute({
  access: "customer",
  async handler({ request, session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const skip = Math.max(Number(searchParams.get("offset") ?? 0), 0);
    const result = await listAccountBookings({
      userId: session.user.id,
      take,
      skip,
    });
    return NextResponse.json(result);
  },
});
