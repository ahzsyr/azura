import { NextResponse } from "next/server";
import { formSubmitRequestSchema } from "@/features/forms/schemas/form-definition";
import "@/features/forms/platform/register-commands.server";
import { commandBus } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { auth } from "@/lib/auth";
import { isCustomerRole } from "@/features/auth/portal";

export async function POST(request: Request) {
  try {
    const clientIp = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `forms-submit:${clientIp}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

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
        customerId,
      },
    };

    const result = await commandBus.execute("Submit", command);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Form submit error:", error);
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
