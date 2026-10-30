import { NextRequest, NextResponse } from "next/server";
import { requireModulePermission } from "@/features/auth/guards";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";
import { getRequestAppUrl } from "@/lib/oauth-redirect-origin";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { findProvider } from "@/modules/marketing/core/registry";
import { exchangeMetaCode } from "@/modules/marketing/providers/meta/sdk/api";
import { exchangeLinkedInCode } from "@/modules/marketing/providers/linkedin/sdk/api";
import { exchangeGoogleAdsCode } from "@/modules/marketing/providers/google-ads/sdk/api";
import {
  syncAccountsForConnection,
  upsertConnectionFromOAuth,
} from "@/modules/marketing/oauth/connection-lifecycle";
import { getProviderAppCredentials } from "@/modules/marketing/providers/app-config";
import { resolveMarketingIngressAccess } from "@/modules/marketing/ingress-guard";
import { handleMarketingOAuthCallbackIngress } from "@/modules/marketing/ingress/handlers";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  await requireModulePermission(MARKETING_MODULE_ID, "manage");

  const { provider: providerId } = await context.params;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(`marketing_oauth_state_${providerId}`)?.value;
  const redirectUri = request.cookies.get(`marketing_oauth_redirect_${providerId}`)?.value;

  const clearOAuthCookies = (response: NextResponse) => {
    response.cookies.delete(`marketing_oauth_state_${providerId}`);
    response.cookies.delete(`marketing_oauth_redirect_${providerId}`);
  };

  return handleMarketingOAuthCallbackIngress({
    resolveAccess: resolveMarketingIngressAccess,
    validateState: () => {
      if (!code || !state || !expectedState || state !== expectedState || !redirectUri) {
        return "oauth_state";
      }
      return "ok";
    },
    stateInvalidRedirect: () =>
      NextResponse.redirect(
        getRequestAppUrl(
          request,
          `/admin/marketing/platforms?provider=${providerId}&error=oauth_state`,
        ),
      ),
    inactiveRedirect: (reason) =>
      NextResponse.redirect(
        getRequestAppUrl(
          request,
          `/admin/marketing/platforms?provider=${providerId}&error=marketing_inactive&reason=${encodeURIComponent(reason)}`,
        ),
      ),
    clearOAuthCookies,
    exchangeAndPersist: async () => {
      // Bootstrap only after CSRF + active checks so inactive callbacks never
      // rely on an empty in-memory provider registry for control flow.
      await bootstrapMarketingModule();
      const provider = findProvider(providerId);
      if (!provider) {
        const response = NextResponse.redirect(
          getRequestAppUrl(request, "/admin/marketing/platforms?error=unknown_provider"),
        );
        clearOAuthCookies(response);
        return response;
      }

      const credentials = await getProviderAppCredentials(providerId);
      const clientId = credentials.clientId?.trim() || "";
      const clientSecret =
        credentials.clientSecret?.trim() ||
        (providerId === "meta" ? credentials.appSecret?.trim() || "" : "");

      if (!clientId || !clientSecret) {
        const response = NextResponse.redirect(
          getRequestAppUrl(
            request,
            `/admin/marketing/platforms?provider=${providerId}&error=missing_client_secret`,
          ),
        );
        clearOAuthCookies(response);
        return response;
      }

      try {
        let accessToken = "";
        let refreshToken: string | undefined;
        let expiresAt: Date | null = null;

        if (providerId === "meta") {
          const token = await exchangeMetaCode({
            code: code!,
            redirectUri: redirectUri!,
            clientId,
            clientSecret,
          });
          accessToken = token.access_token;
          expiresAt = token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : null;
        } else if (providerId === "linkedin") {
          const token = await exchangeLinkedInCode({
            code: code!,
            redirectUri: redirectUri!,
            clientId,
            clientSecret,
          });
          accessToken = token.access_token;
          refreshToken = token.refresh_token;
          expiresAt = token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : null;
        } else if (providerId === "google-ads") {
          const token = await exchangeGoogleAdsCode({
            code: code!,
            redirectUri: redirectUri!,
            clientId,
            clientSecret,
          });
          accessToken = token.access_token;
          refreshToken = token.refresh_token;
          expiresAt = token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : null;
        } else {
          throw new Error(`OAuth exchange not implemented for ${providerId}`);
        }

        const connection = await upsertConnectionFromOAuth({
          providerId,
          accessToken,
          refreshToken,
          expiresAt,
          grantedScopes: provider.manifest.oauthConfig.scopes,
          oauthMetadata: { redirectUri },
        });

        if (provider.listAccounts) {
          const accounts = await provider.listAccounts(connection.id);
          await syncAccountsForConnection(connection.id, accounts);
        }

        const response = NextResponse.redirect(
          getRequestAppUrl(
            request,
            `/admin/marketing/platforms?provider=${providerId}&connected=1`,
          ),
        );
        clearOAuthCookies(response);
        return response;
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "oauth_failed";
        const message =
          rawMessage.includes("marketingProviderRuntime") ||
          rawMessage.includes("MarketingProviderRuntime") ||
          rawMessage.includes("marketingConnection") ||
          rawMessage.includes("MarketingConnection") ||
          rawMessage.includes("The table")
            ? "marketing_schema_missing"
            : rawMessage;
        const response = NextResponse.redirect(
          getRequestAppUrl(
            request,
            `/admin/marketing/platforms?provider=${providerId}&error=${encodeURIComponent(message.slice(0, 80))}`,
          ),
        );
        clearOAuthCookies(response);
        return response;
      }
    },
  });
}
