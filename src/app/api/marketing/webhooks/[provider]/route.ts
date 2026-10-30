import { NextRequest, NextResponse } from "next/server";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { ingestMarketingWebhook } from "@/modules/marketing/webhooks/ingest";
import { getProviderAppCredentials } from "@/modules/marketing/providers/app-config";
import { resolveMarketingIngressAccess } from "@/modules/marketing/ingress-guard";
import {
  handleMarketingWebhookGetIngress,
  handleMarketingWebhookPostIngress,
} from "@/modules/marketing/ingress/handlers";

export const runtime = "nodejs";

/* @public — provider webhook ingress (signature verified in ingest when active) */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  return handleMarketingWebhookGetIngress({
    resolveAccess: resolveMarketingIngressAccess,
    completeChallenge: async () => {
      if (provider !== "meta") return null;
      const mode = request.nextUrl.searchParams.get("hub.mode");
      const token = request.nextUrl.searchParams.get("hub.verify_token");
      const challenge = request.nextUrl.searchParams.get("hub.challenge");
      const credentials = await getProviderAppCredentials("meta");
      const expected = credentials.webhookVerifyToken?.trim();
      if (mode === "subscribe" && token && expected && token === expected && challenge) {
        return new NextResponse(challenge, { status: 200 });
      }
      return null;
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  return handleMarketingWebhookPostIngress({
    resolveAccess: resolveMarketingIngressAccess,
    ingest: async () => {
      await bootstrapMarketingModule();
      const { provider } = await context.params;
      const rawBody = await request.text();
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      let parsedBody: unknown = {};
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        parsedBody = { raw: rawBody };
      }

      return ingestMarketingWebhook({
        providerId: provider,
        rawBody,
        headers,
        parsedBody,
      });
    },
  });
}
