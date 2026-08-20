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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const data = updateProfileSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    return NextResponse.json({ success: true, user: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
