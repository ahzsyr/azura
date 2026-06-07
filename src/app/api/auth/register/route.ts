import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  emptyToNull,
  parseDateOfBirth,
  registerSchema,
} from "@/features/setup/setup-complete.schema";
import { isRegistrationEnabled } from "@/features/setup/setup.service";

export async function POST(request: Request) {
  try {
    if (!(await isRegistrationEnabled())) {
      return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "CUSTOMER",
        phone: data.phone,
        dateOfBirth: parseDateOfBirth(data.dateOfBirth),
        addressLine1: data.addressLine1,
        addressLine2: emptyToNull(data.addressLine2),
        city: data.city,
        state: emptyToNull(data.state),
        postalCode: emptyToNull(data.postalCode),
        country: data.country,
        marketingOptIn: data.marketingOptIn ?? false,
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
