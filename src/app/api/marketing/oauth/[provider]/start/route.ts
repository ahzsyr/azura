import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import {
  ensureCanonicalOAuthRequest,
  getOAuthOrigin,
  getRequestAppUrl,
} from "@/lib/oauth-redirect-origin";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { findProvider } from "@/modules/marketing/core/registry";
import { getProviderAppCredentials } from "@/modules/marketing/providers/app-config";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  await requireAdmin();
  bootstrapMarketingModule();

  const canonicalRedirect = ensureCanonicalOAuthRequest(request);
  if (canonicalRedirect) return canonicalRedirect;

  const { provider: providerId } = await context.params;
  const provider = findProvider(providerId);
  if (!provider) {
    return NextResponse.redirect(
      getRequestAppUrl(request, `/admin/marketing/platforms?error=unknown_provider`),
    );
  }

  const credentials = await getProviderAppCredentials(providerId);
  const clientId = credentials.clientId?.trim() || "";

  if (!clientId) {
    return NextResponse.redirect(
      getRequestAppUrl(
        request,
        `/admin/marketing/platforms?provider=${providerId}&error=missing_client_id`,
      ),
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL(provider.manifest.oauthConfig.callbackPath, getOAuthOrigin(request)).href;
  const authUrl = new URL(provider.manifest.oauthConfig.authorizeUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", provider.manifest.oauthConfig.scopes.join(" "));
  if (providerId === "meta") {
    authUrl.searchParams.set("auth_type", "rerequest");
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`marketing_oauth_state_${providerId}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  response.cookies.set(`marketing_oauth_redirect_${providerId}`, redirectUri, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
