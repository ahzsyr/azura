import { NextRequest, NextResponse } from "next/server";
import { seoRepository } from "@/repositories/seo.repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get("seo_google_oauth_state")?.value;
  if (!code || !state || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth callback" }, { status: 400 });
  }

  const integrations = await seoRepository.getIntegrationsConfig();
  const google = integrations.google ?? {};
  const clientId = google.clientId || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = google.clientSecret || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing Google OAuth client credentials" }, { status: 400 });
  }

  const redirectUri = new URL("/api/seo/analytics/google/oauth/callback", request.url).href;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    return NextResponse.json({ error: await tokenResponse.text() }, { status: 400 });
  }
  const body = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  await seoRepository.upsertIntegrationsConfig({
    ...integrations,
    google: {
      ...google,
      analyticsEnabled: true,
      bearerToken: body.access_token ?? google.bearerToken,
      refreshToken: body.refresh_token ?? google.refreshToken,
      tokenExpiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000).toISOString()
        : google.tokenExpiresAt,
    },
  });

  const response = NextResponse.redirect(new URL("/admin/seo/integrations", request.url));
  response.cookies.delete("seo_google_oauth_state");
  return response;
}
