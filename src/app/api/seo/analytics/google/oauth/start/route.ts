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

export async function GET(request: NextRequest) {
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
    env: {
      oauthClientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
      oauthClientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    },
  });

  const clientIdFromConfig = config.clientId?.trim() || "";
  const clientId =
    oauthClient.clientId ||
    clientIdFromConfig ||
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() ||
    "";
  const isRscPrefetch = request.nextUrl.searchParams.has("_rsc");

  if (!clientId) {
    if (isRscPrefetch) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.redirect(
      getRequestAppUrl(request, "/admin/seo/google?tab=search-console&googleOAuth=missing_client_id"),
    );
  }

  const scopeParam = request.nextUrl.searchParams.get("scopes");
  const integrationParam = request.nextUrl.searchParams.get("integration");
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

  const state = crypto.randomUUID();
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
  return response;
}
