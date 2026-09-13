import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";
import { passwordResetSettingsSchema } from "@/features/account/account-settings.schema";
import { accountSettingsService } from "@/features/account/account-settings.service";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await accountSettingsService.get();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const passwordReset = passwordResetSettingsSchema.parse(body.passwordReset ?? body);
    const settings = await accountSettingsService.savePasswordReset(passwordReset);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
