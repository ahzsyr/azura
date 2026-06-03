import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inquirySchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = inquirySchema.parse(body);

    const inquiry = await prisma.inquiry.create({
      data: {
        type: data.type === "PACKAGE" ? "CONTENT" : data.type,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        contentItemId: data.contentItemId || data.packageId || null,
        locale: data.locale,
      },
    });

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
