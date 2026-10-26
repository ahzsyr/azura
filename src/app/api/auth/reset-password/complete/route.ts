import { NextResponse } from "next/server";
import { postCompleteReset } from "@/features/account/password-reset.api";
import { defineApiRoute } from "@/lib/api-auth";

/**
 * Step 3 of the password-reset flow: set a new password behind a verified
 * ticket. The ticket is the credential, so the route is public.
 */
export const POST = defineApiRoute({
  access: "public",
  handler: async ({ request }) => postCompleteReset(request),
});

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
