import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/features/account/password-reset.schema";
import { consumePasswordResetToken } from "@/features/account/password-reset.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = resetPasswordSchema.parse(body);
    const result = await consumePasswordResetToken({
      token: data.token,
      password: data.password,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
