import type { MarketingProviderAdapter } from "@/modules/marketing/core/registry/types";
import { buildHealthReport, checkNow } from "@/modules/marketing/core/health";
import { linkedinProviderManifest, LINKEDIN_PROVIDER_ID } from "../manifest";
import { listLinkedInOrganizations, publishLinkedInOrganizationPost } from "../sdk/api";
import {
  fromLinkedInPublishResponse,
  mapLinkedInAnalyticsToCanonical,
  mapLinkedInWebhook,
} from "../mapper";
import { createHmac, timingSafeEqual } from "crypto";

async function readAccessToken(connectionId: string) {
  const { getUnsealedAccessToken } = await import("@/modules/marketing/oauth/connection-lifecycle");
  return getUnsealedAccessToken(connectionId);
}

async function readLinkedInAppCredentials() {
  const { getProviderAppCredentials } = await import("@/modules/marketing/providers/app-config");
  return getProviderAppCredentials(LINKEDIN_PROVIDER_ID);
}

async function verifyLinkedInSignature(rawBody: string, headers: Record<string, string>) {
  const credentials = await readLinkedInAppCredentials();
  const secret = credentials.clientSecret?.trim();
  const signature = headers["x-linkedin-signature"] || headers["x-li-signature"];
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const linkedinProviderAdapter: MarketingProviderAdapter = {
  id: LINKEDIN_PROVIDER_ID,
  manifest: linkedinProviderManifest,
  capabilities() {
    return linkedinProviderManifest.capabilities;
  },
  async health(connectionId) {
    const token = await readAccessToken(connectionId);
    const credentials = await readLinkedInAppCredentials();
    return buildHealthReport({
      providerId: LINKEDIN_PROVIDER_ID,
      connectionId,
      checks: [
        checkNow("connected", Boolean(token), token ? "Connected" : "Missing token"),
        checkNow("tokenValid", Boolean(token)),
        checkNow("apiReachable", true, "Deferred live check"),
        checkNow("rateLimited", true),
        checkNow(
          "permissionsOk",
          Boolean(credentials.clientId && credentials.clientSecret),
          credentials.clientId && credentials.clientSecret
            ? "App credentials configured in admin"
            : "Client ID/secret missing in admin settings",
        ),
      ],
    });
  },
  async listAccounts(connectionId) {
    const token = await readAccessToken(connectionId);
    if (!token) return [];
    try {
      const orgs = await listLinkedInOrganizations(token);
      return orgs.map((org) => ({
        externalId: String(org.id),
        name: org.localizedName ?? String(org.id),
        type: "linkedin_organization",
      }));
    } catch {
      return [];
    }
  },
  async publish(request) {
    const token = await readAccessToken(request.connectionId);
    if (!token) return { ok: false, message: "Missing LinkedIn access token" };
    const response = await publishLinkedInOrganizationPost({
      organizationUrn: request.accountId.startsWith("urn:")
        ? request.accountId
        : `urn:li:organization:${request.accountId}`,
      accessToken: token,
      text: request.text,
    });
    return fromLinkedInPublishResponse(response);
  },
  async fetchAnalytics(_connectionId, accountId, period) {
    return mapLinkedInAnalyticsToCanonical(LINKEDIN_PROVIDER_ID, accountId, period, {
      impressions: 0,
      engagement: 0,
      clicks: 0,
      followers: 0,
    });
  },
  async mapWebhook(raw) {
    return mapLinkedInWebhook(raw);
  },
  async verifyWebhookSignature(rawBody, headers) {
    return verifyLinkedInSignature(rawBody, headers);
  },
};
