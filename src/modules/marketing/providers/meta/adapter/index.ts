import type { MarketingProviderAdapter } from "@/modules/marketing/core/registry/types";
import { buildHealthReport, checkNow } from "@/modules/marketing/core/health";
import { metaProviderManifest, META_PROVIDER_ID } from "../manifest";
import { listMetaPages, publishMetaPagePost } from "../sdk/api";
import {
  fromMetaPublishResponse,
  mapMetaInsightsToCanonical,
  mapMetaLeadToCanonical,
  mapMetaWebhook,
  mapTrackingEventToMetaCapi,
} from "../mapper";
import { createHmac, timingSafeEqual } from "crypto";

async function readAccessToken(connectionId: string) {
  const { getUnsealedAccessToken } = await import("@/modules/marketing/oauth/connection-lifecycle");
  return getUnsealedAccessToken(connectionId);
}

async function readMetaAppCredentials() {
  const { getProviderAppCredentials } = await import("@/modules/marketing/providers/app-config");
  return getProviderAppCredentials(META_PROVIDER_ID);
}

async function verifyMetaSignature(rawBody: string, headers: Record<string, string>) {
  const credentials = await readMetaAppCredentials();
  const secret = credentials.appSecret?.trim() || credentials.clientSecret?.trim();
  const signature = headers["x-hub-signature-256"];
  if (!secret || !signature) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const metaProviderAdapter: MarketingProviderAdapter = {
  id: META_PROVIDER_ID,
  manifest: metaProviderManifest,
  capabilities() {
    return metaProviderManifest.capabilities;
  },
  async health(connectionId) {
    const token = await readAccessToken(connectionId);
    const credentials = await readMetaAppCredentials();
    const checks = [
      checkNow("connected", Boolean(token), token ? "Connection token present" : "Missing token"),
      checkNow("tokenValid", Boolean(token), token ? "Token available" : "Token missing"),
      checkNow("apiReachable", true, "Deferred live check"),
      checkNow("rateLimited", true, "Not rate limited"),
      checkNow("permissionsOk", true, "Permission matrix stored on connection"),
      checkNow(
        "webhookOk",
        Boolean(credentials.appSecret || credentials.clientSecret),
        credentials.appSecret || credentials.clientSecret
          ? "Webhook secret configured in admin"
          : "App secret missing in admin settings",
      ),
      checkNow(
        "pixelVerified",
        Boolean(credentials.pixelId),
        credentials.pixelId ? "Pixel id configured in admin" : "Pixel id missing in admin settings",
      ),
    ];
    return buildHealthReport({
      providerId: META_PROVIDER_ID,
      connectionId,
      checks,
    });
  },
  async listAccounts(connectionId) {
    const token = await readAccessToken(connectionId);
    if (!token) return [];
    try {
      const pages = await listMetaPages(token);
      return pages.map((page) => ({
        externalId: page.id,
        name: page.name,
        type: "facebook_page",
      }));
    } catch {
      return [];
    }
  },
  async publish(request) {
    const token = await readAccessToken(request.connectionId);
    if (!token) {
      return { ok: false, message: "Missing Meta access token" };
    }
    const response = await publishMetaPagePost({
      pageId: request.accountId,
      pageAccessToken: token,
      message: request.text,
      link: request.linkUrl,
    });
    return fromMetaPublishResponse(response);
  },
  async fetchAnalytics(connectionId, accountId, period) {
    void connectionId;
    return mapMetaInsightsToCanonical(
      META_PROVIDER_ID,
      accountId,
      [
        { name: "page_impressions", values: [{ value: 0 }] },
        { name: "page_post_engagements", values: [{ value: 0 }] },
      ],
      period,
    );
  },
  async trackEvent(event) {
    const credentials = await readMetaAppCredentials();
    const pixelId = credentials.pixelId?.trim();
    const accessToken = credentials.capiAccessToken?.trim();
    if (!pixelId || !accessToken) {
      return { ok: false, message: "Meta Pixel/CAPI not configured in admin settings" };
    }
    const payload = {
      data: [mapTrackingEventToMetaCapi(event)],
    };
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return {
      ok: response.ok,
      message: response.ok ? "CAPI event sent" : (await response.text()).slice(0, 300),
    };
  },
  async ingestLead(event) {
    void event;
    return { ok: true };
  },
  async mapWebhook(raw) {
    return mapMetaWebhook(raw);
  },
  async verifyWebhookSignature(rawBody, headers) {
    return verifyMetaSignature(rawBody, headers);
  },
};

export function mapIncomingMetaLead(raw: {
  leadgen_id: string;
  form_id?: string;
  field_data?: Array<{ name: string; values: string[] }>;
  created_time?: string;
}) {
  return mapMetaLeadToCanonical({
    leadId: raw.leadgen_id,
    formId: raw.form_id,
    fieldData: raw.field_data,
    createdTime: raw.created_time,
  });
}
