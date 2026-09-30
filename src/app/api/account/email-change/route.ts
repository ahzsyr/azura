import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCustomerRole } from "@/features/auth/portal";
import { startEmailChange } from "@/features/account/email-change.service";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
  locale: z.string().min(2).max(10).default("en"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isCustomerRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sessionVersion: true, disabledAt: true },
  });
  if (!row || row.disabledAt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tokenVersion = (session.user as { sessionVersion?: number }).sessionVersion ?? 0;
  if (tokenVersion !== (row.sessionVersion ?? 0)) {
    return NextResponse.json({ error: "Session revoked" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);
    const result = await startEmailChange({
      userId: session.user.id,
      currentPassword: data.currentPassword,
      newEmail: data.newEmail,
      locale: data.locale,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, pendingEmail: result.pendingEmail });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
