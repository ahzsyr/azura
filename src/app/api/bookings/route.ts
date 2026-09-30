import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCustomerRole } from "@/features/auth/portal";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";

const bookingSchema = z.object({
  contentItemId: z.string().min(1).max(64),
  metadata: z
    .record(z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine((m) => !m || Object.keys(m).length <= 20, "Too many metadata keys"),
});

/** Light booking-interest endpoint — attaches customer userId when signed in. */
export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `bookings:${ip}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const data = bookingSchema.parse(body);

    const item = await prisma.contentItem.findFirst({
      where: { id: data.contentItemId, deletedAt: null, status: "PUBLISHED" },
    });
    if (!item) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const session = await auth();
    const userId =
      session?.user?.id && isCustomerRole(session.user.role) ? session.user.id : null;

    const booking = await prisma.booking.create({
      data: {
        contentItemId: data.contentItemId,
        metadata: (data.metadata ?? {}) as object,
        userId,
      },
    });

    return NextResponse.json({ success: true, id: booking.id, status: booking.status });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    message: "Booking API accepts contentItemId",
  });
}
