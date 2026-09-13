import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { defineApiRoute } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { writeSecurityAuditLog } from "@/lib/security-audit";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
});

export const POST = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  async handler({ request, session }) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const body = await request.json();
      const data = bodySchema.parse(body);
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, passwordHash: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      await bumpUserSessionVersion(user.id);
      await writeSecurityAuditLog({
        action: "auth.session.revoked",
        actorId: user.id,
        actorRole: user.role,
        meta: { reason: "ADMIN_SIGNOUT_EVERYWHERE" },
      });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  },
});
