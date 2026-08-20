import { NextResponse } from "next/server";
import { newsletterSubscribeSchema } from "@/features/forms/schemas/form-definition";
import { subscribeNewsletter } from "@/features/forms/newsletter.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = newsletterSubscribeSchema.parse(body);
    const result = await subscribeNewsletter({
      email: data.email,
      name: data.name,
      segment: data.segment,
      locale: data.locale,
      doubleOptIn: data.doubleOptIn,
      webhookUrl: data.webhookUrl || undefined,
      blockId: data.blockId,
      pageSlug: data.pageSlug,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
