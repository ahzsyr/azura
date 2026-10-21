import { NextResponse } from "next/server";
import { passwordResetSettingsSchema } from "@/features/account/account-settings.schema";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { defineApiRoute } from "@/lib/api-auth";

export const GET = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async () => {
    const settings = await accountSettingsService.get();
    return NextResponse.json(settings);
  },
});

export const PATCH = defineApiRoute({
  access: "admin",
  skipAdminLifecycleGate: true,
  verifySessionVersion: false,
  handler: async ({ request }) => {
    try {
      const body = await request.json();
      const passwordReset = passwordResetSettingsSchema.parse(body.passwordReset ?? body);
      const settings = await accountSettingsService.savePasswordReset(passwordReset);
      return NextResponse.json(settings);
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  },
});
