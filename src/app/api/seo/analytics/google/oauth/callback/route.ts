import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { seoRepository } from "@/repositories/seo.repository";
import { getGoogleOAuthRedirectUri, getRequestAppUrl } from "@/lib/oauth-redirect-origin";
import { getGooglePlatformState, upsertGooglePlatformState } from "@/features/seo/google-platform/persistence";
import { createGoogleConnectionManager } from "@/features/seo/google-platform/connection-manager";
import { googleIntegrationRegistry } from "@/features/seo/google-platform/registry";
import type { GoogleIntegrationId } from "@/features/seo/google-platform/types";

export const runtime = "nodejs";

function defaultSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function oauthAdminRedirect(
  request: NextRequest,
  params: Record<string, string>,
  tab = "search-console",
) {
  const search = new URLSearchParams({ tab, ...params });
  const response = NextResponse.redirect(
    getRequestAppUrl(request, `/admin/seo/google?${search.toString()}`),
  );
  response.cookies.delete("seo_google_oauth_state");
  response.cookies.delete("seo_google_oauth_redirect_uri");
  response.cookies.delete("seo_google_oauth_integration");
  return response;
}

function revalidateIntegrationsPaths() {
  revalidatePath("/admin/seo/google");
  revalidatePath("/admin/seo/integrations");
  revalidatePath("/admin/seo/settings");
  revalidatePath("/admin/seo");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get("seo_google_oauth_state")?.value;
  const integrationId =
    (request.cookies.get("seo_google_oauth_integration")?.value as GoogleIntegrationId | undefined) ??
    "search_console";
  const integration = googleIntegrationRegistry.get(integrationId);
  const targetTab = integration?.tabId ?? "search-console";
  if (!code || !state || state !== expectedState) {
    return oauthAdminRedirect(request, {
      googleOAuth: "error",
      message: "Invalid OAuth callback. Try connecting again.",
    }, targetTab);
  }

  const integrations = await seoRepository.getIntegrationsConfig();
  const google = integrations.google ?? {};
  const clientId =
    google.clientId?.trim() || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() || "";
  const clientSecret =
    google.clientSecret?.trim() || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) {
    return oauthAdminRedirect(request, {
      googleOAuth: "error",
      message: "Missing Google OAuth client credentials.",
    }, targetTab);
  }

  const redirectUri =
    request.cookies.get("seo_google_oauth_redirect_uri")?.value ?? getGoogleOAuthRedirectUri(request);
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
    const detail = (await tokenResponse.text()).slice(0, 200);
    return oauthAdminRedirect(request, {
      googleOAuth: "error",
      message: `Google token exchange failed: ${detail || tokenResponse.statusText}`,
    }, targetTab);
  }
  const body = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  const resolvedClientSecret =
    google.clientSecret?.trim() || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();

  await seoRepository.upsertIntegrationsConfig({
    ...integrations,
    google: {
      ...google,
      enabled: true,
      analyticsEnabled: true,
      siteUrl: google.siteUrl?.trim() || defaultSiteUrl(),
      clientId,
      clientSecret: resolvedClientSecret,
      bearerToken: body.access_token ?? google.bearerToken,
      refreshToken: body.refresh_token ?? google.refreshToken,
      tokenExpiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000).toISOString()
        : google.tokenExpiresAt,
    },
  });

  const grantedScopes = body.scope?.split(/\s+/).filter(Boolean) ?? [];
  const platform = await getGooglePlatformState();
  const manager = createGoogleConnectionManager(platform);
  const requiredScopes = integration?.requiredScopes ?? [];
  const existingConnection = platform.services[integrationId]?.connection;
  const account =
    existingConnection?.account ??
    (integrationId === "search_console" ? google.siteUrl?.trim() || null : null);
  manager.connect(integrationId, {
    method: "oauth",
    bearerToken: body.access_token ?? google.bearerToken,
    refreshToken: body.refresh_token ?? google.refreshToken,
    clientId,
    clientSecret: resolvedClientSecret,
    scopes: grantedScopes.length > 0 ? grantedScopes : existingConnection?.grantedScopes ?? [],
    account: account ?? undefined,
    tokenExpiresAt: body.expires_in
      ? new Date(Date.now() + body.expires_in * 1000).toISOString()
      : google.tokenExpiresAt,
  });
  manager.updateScopes(
    integrationId,
    grantedScopes.length > 0 ? grantedScopes : existingConnection?.grantedScopes ?? [],
    requiredScopes,
  );
  await upsertGooglePlatformState(manager.snapshot());

  revalidateIntegrationsPaths();

  return oauthAdminRedirect(request, { googleOAuth: "success" }, targetTab);
}
