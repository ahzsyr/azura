import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/account/password-reset.schema";
import { requestPasswordReset } from "@/features/account/password-reset.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);
    await requestPasswordReset({ email: data.email, locale: data.locale });
    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, you will receive password reset instructions shortly.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
