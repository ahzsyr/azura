import { NextResponse } from "next/server";
import { formSubmitRequestSchema } from "@/features/forms/schemas/form-definition";
import "@/features/forms/platform/register-commands.server";
import { commandBus } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { PUBLIC_FORM_BODY_MAX_BYTES, classifyContentLength } from "@/lib/security/abuse-controls";
import {
  RateLimitUnavailableError,
  checkFormSubmitRateLimit,
} from "@/features/forms/platform/handlers/spam-handler";
import { auth } from "@/lib/auth";
import { isCustomerRole } from "@/features/auth/portal";
import { EmailDomainError } from "@/lib/security/email-domain.server";

function unavailable() {
  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}

export async function POST(request: Request) {
  const size = classifyContentLength(request.headers.get("content-length"), PUBLIC_FORM_BODY_MAX_BYTES);
  if (size !== "ok") {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const clientIp = getTrustedClientIp(request);
  try {
    const allowed = await checkFormSubmitRateLimit(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return unavailable();
    console.error("[forms/submit] rate limit failed", error instanceof Error ? error.name : "unknown");
    return unavailable();
  }

  try {
    const body = await request.json();
    const turnstileOk = await verifyTurnstileToken(
      typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined,
      clientIp,
    );
    if (!turnstileOk) {
      return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
    }

    const data = formSubmitRequestSchema.parse(body);
    const session = await auth();
    const customerId =
      session?.user?.id && isCustomerRole(session.user.role) ? session.user.id : undefined;

    const command: SubmitCommand = {
      type: "Submit",
      schemaId: data.templateId,
      bindingValues: data.payload,
      context: {
        blockType: data.blockType,
        blockId: data.blockId,
        pageId: data.pageId,
        pageSlug: data.pageSlug,
        locale: data.locale,
        utm: data.utm,
        abTestId: data.abTestId,
        abVariantId: data.abVariantId,
        honeypot: data.honeypot,
        clientIp,
        rateLimitChecked: true,
        customerId,
      },
    };

    const result = await commandBus.execute("Submit", command);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return unavailable();
    if (error instanceof EmailDomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Form submit error:", error instanceof Error ? error.name : "unknown");
    const message = error instanceof Error ? error.message : "Invalid request";
    if (message.includes("Rate limit")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    if (message.includes("Spam")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
