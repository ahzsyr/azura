import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bookingSchema = z.object({
  contentItemId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

/** Future-ready booking endpoint — accepts contentItemId */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    const item = await prisma.contentItem.findFirst({
      where: { id: data.contentItemId, deletedAt: null, status: "PUBLISHED" },
    });
    if (!item) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const booking = await prisma.booking.create({
      data: {
        contentItemId: data.contentItemId,
        metadata: (data.metadata ?? {}) as object,
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
