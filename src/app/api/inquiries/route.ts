import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inquirySchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = inquirySchema.parse(body);
    const session = await auth();
    const customer =
      session?.user?.role === "CUSTOMER" && session.user.id ? session.user : null;

    const email = (data.email || customer?.email || "").trim().toLowerCase();
    let userId = customer?.id ?? null;
    if (!userId && email) {
      const matched = await prisma.user.findFirst({
        where: { email, role: "CUSTOMER" },
        select: { id: true },
      });
      userId = matched?.id ?? null;
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        type: data.type === "PACKAGE" ? "CONTENT" : data.type,
        name: data.name || customer?.name || "",
        email: data.email || customer?.email || "",
        phone: data.phone,
        message: data.message,
        contentItemId: data.contentItemId || data.packageId || null,
        locale: data.locale,
        userId,
      },
    });

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
