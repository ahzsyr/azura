import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCustomerRole } from "@/features/auth/portal";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { writeSecurityAuditLog } from "@/lib/security-audit";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isCustomerRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      passwordHash: true,
      sessionVersion: true,
      disabledAt: true,
    },
  });
  if (!user || user.disabledAt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tokenVersion = (session.user as { sessionVersion?: number }).sessionVersion ?? 0;
  if (tokenVersion !== (user.sessionVersion ?? 0)) {
    return NextResponse.json({ error: "Session revoked" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    await bumpUserSessionVersion(user.id);
    await writeSecurityAuditLog({
      action: "auth.session.revoked",
      actorId: user.id,
      actorRole: user.role,
      meta: { reason: "USER_SIGNOUT_EVERYWHERE" },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
