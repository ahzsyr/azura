import { NextResponse } from "next/server";
import { postVerifyResetCode } from "@/features/account/password-reset.api";
import { defineApiRoute } from "@/lib/api-auth";

/**
 * Step 2 of the password-reset flow: exchange the emailed 6-digit code for a
 * short-lived ticket. The code is the credential, so the route is public.
 */
export const POST = defineApiRoute({
  access: "public",
  handler: async ({ request }) => postVerifyResetCode(request),
});

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
