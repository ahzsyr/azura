import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { seoRepository } from "@/repositories/seo.repository";
import {
  ensureCanonicalOAuthRequest,
  getGoogleOAuthRedirectUri,
  getRequestAppUrl,
} from "@/lib/oauth-redirect-origin";
import { googleIntegrationRegistry } from "@/features/seo/google-platform/registry";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";
import { createGoogleConnectionManager } from "@/features/seo/google-platform/connection-manager";

export const runtime = "nodejs";

function tabForIntegration(integrationId: string | null): string {
  if (!integrationId) return "search-console";
  return googleIntegrationRegistry.get(integrationId as never)?.tabId ?? "search-console";
}

/** Encode nonce + integration so callback still knows the tab if the cookie is lost. */
function buildOAuthState(integrationId: string | null): string {
  const nonce = crypto.randomUUID();
  if (!integrationId) return nonce;
  return `${nonce}.${integrationId}`;
}

export async function GET(request: NextRequest) {
  // Next.js <Link>/router soft-nav adds `_rsc`; never follow those into Google OAuth (CORS).
  if (request.nextUrl.searchParams.has("_rsc")) {
    return new NextResponse(null, { status: 204 });
  }

  await requireAdmin();

  const canonicalRedirect = ensureCanonicalOAuthRequest(request);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const config = (await seoRepository.getIntegrationsConfig()).google ?? {};
  const platform = await getGooglePlatformState();
  const manager = createGoogleConnectionManager(platform);
  const oauthClient = manager.resolveOAuthClient({
    platform,
    legacyIntegrations: { google: config as never },
  });

  const clientId = oauthClient.clientId?.trim() || "";
  const clientSecret = oauthClient.clientSecret?.trim() || "";
  const integrationParam = request.nextUrl.searchParams.get("integration");

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      getRequestAppUrl(
        request,
        `/admin/seo/google?tab=${tabForIntegration(integrationParam)}&googleOAuth=error&message=${encodeURIComponent(
          !clientId
            ? "Missing Google OAuth Client ID. Save Client ID and Secret under SEO → Google → Settings."
            : "Missing Google OAuth Client Secret. Re-save the secret under SEO → Google → Settings (must match the Client ID in Google Cloud).",
        )}`,
      ),
    );
  }

  const scopeParam = request.nextUrl.searchParams.get("scopes");
  const registryScopes = integrationParam
    ? googleIntegrationRegistry.get(integrationParam as never)?.requiredScopes ?? []
    : [];
  const defaultScopes = [
    ...new Set([
      ...googleIntegrationRegistry.require("search_console").requiredScopes,
      ...googleIntegrationRegistry.require("analytics").requiredScopes,
      ...registryScopes,
    ]),
  ];
  const scopes =
    scopeParam?.split(/[,\s]+/).filter(Boolean).length
      ? scopeParam.split(/[,\s]+/).filter(Boolean)
      : defaultScopes;

  const state = buildOAuthState(integrationParam);
  const redirectUri = getGoogleOAuthRedirectUri(request);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("seo_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  response.cookies.set("seo_google_oauth_redirect_uri", redirectUri, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  if (integrationParam) {
    response.cookies.set("seo_google_oauth_integration", integrationParam, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });
  }
  return response;
}
