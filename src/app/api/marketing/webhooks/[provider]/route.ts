import { NextRequest, NextResponse } from "next/server";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { ingestMarketingWebhook } from "@/modules/marketing/webhooks/ingest";
import { getProviderAppCredentials } from "@/modules/marketing/providers/app-config";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  // Meta webhook verification challenge
  if (provider === "meta") {
    const mode = request.nextUrl.searchParams.get("hub.mode");
    const token = request.nextUrl.searchParams.get("hub.verify_token");
    const challenge = request.nextUrl.searchParams.get("hub.challenge");
    const credentials = await getProviderAppCredentials("meta");
    const expected = credentials.webhookVerifyToken?.trim();
    if (mode === "subscribe" && token && expected && token === expected && challenge) {
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  bootstrapMarketingModule();
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

  try {
    const event = await ingestMarketingWebhook({
      providerId: provider,
      rawBody,
      headers,
      parsedBody,
    });
    return NextResponse.json({ ok: true, id: event.id, status: event.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
