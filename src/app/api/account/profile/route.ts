import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  emptyToNull,
  parseDateOfBirth,
  updateProfileSchema,
} from "@/features/setup/setup-complete.schema";
import { isCustomerRole } from "@/features/auth/portal";
import { writeSecurityAuditLog } from "@/lib/security-audit";

async function assertCustomerSessionWithVersion() {
  const session = await auth();
  if (!session?.user?.id || !isCustomerRole(session.user.role)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      passwordHash: true,
      sessionVersion: true,
      role: true,
      disabledAt: true,
    },
  });
  if (!row || row.disabledAt) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const tokenVersion = (session.user as { sessionVersion?: number }).sessionVersion ?? 0;
  if (tokenVersion !== (row.sessionVersion ?? 0)) {
    return { error: NextResponse.json({ error: "Session revoked" }, { status: 401 }) };
  }
  return { session, user: row };
}

export async function GET() {
  const gate = await assertCustomerSessionWithVersion();
  if ("error" in gate) return gate.error;

  const user = await prisma.user.findUnique({
    where: { id: gate.session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      marketingOptIn: true,
      pendingEmail: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const gate = await assertCustomerSessionWithVersion();
  if ("error" in gate) return gate.error;

  try {
    const body = await request.json();
    const data = updateProfileSchema.parse(body);
    const user = gate.user;

    const update: Prisma.UserUpdateInput = {};
    if (data.name) update.name = data.name;
    if (data.phone) update.phone = data.phone;
    if (data.dateOfBirth) update.dateOfBirth = parseDateOfBirth(data.dateOfBirth);
    if (data.addressLine1) update.addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) update.addressLine2 = emptyToNull(data.addressLine2);
    if (data.city) update.city = data.city;
    if (data.state !== undefined) update.state = emptyToNull(data.state);
    if (data.postalCode !== undefined) update.postalCode = emptyToNull(data.postalCode);
    if (data.country) update.country = data.country;
    if (data.marketingOptIn !== undefined) update.marketingOptIn = data.marketingOptIn;

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json({ error: "Current password required" }, { status: 400 });
      }
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      update.passwordHash = await bcrypt.hash(data.newPassword, 12);
      update.sessionVersion = { increment: 1 };
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: update,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
      },
    });

    if (data.newPassword) {
      await writeSecurityAuditLog({
        action: "auth.password.changed",
        actorId: user.id,
        actorRole: user.role,
      });
      await writeSecurityAuditLog({
        action: "auth.session.revoked",
        actorId: user.id,
        actorRole: user.role,
        meta: { reason: "PASSWORD_CHANGED" },
      });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
