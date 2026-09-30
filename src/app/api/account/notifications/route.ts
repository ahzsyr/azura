import { NextResponse } from "next/server";
import { z } from "zod";
import { defineApiRoute } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { listAccountActivity } from "@/features/account/account-portal.service";

const patchSchema = z.object({
  marketingOptIn: z.boolean(),
});

export const GET = defineApiRoute({
  access: "customer",
  async handler({ session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { marketingOptIn: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const activity = await listAccountActivity({
      userId: session.user.id,
      userEmail: session.user.email ?? "",
      limit: 20,
    });
    return NextResponse.json({
      preferences: { marketingOptIn: user.marketingOptIn },
      activity,
    });
  },
});

export const PATCH = defineApiRoute({
  access: "customer",
  async handler({ request, session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const body = await request.json();
      const data = patchSchema.parse(body);
      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { marketingOptIn: data.marketingOptIn },
        select: { marketingOptIn: true },
      });
      return NextResponse.json({ preferences: { marketingOptIn: user.marketingOptIn } });
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  },
});
