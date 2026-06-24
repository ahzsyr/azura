import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { seoRepository } from "@/repositories/seo.repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const config = (await seoRepository.getIntegrationsConfig()).google ?? {};
  const clientId = config.clientId || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Missing Google OAuth client ID" }, { status: 400 });
  }
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/seo/analytics/google/oauth/callback", request.url).href;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("seo_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
