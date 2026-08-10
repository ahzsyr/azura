import { NextResponse } from "next/server";
import { formSubmitRequestSchema } from "@/features/forms/schemas/form-definition";
import "@/features/forms/platform/register-commands.server";
import { commandBus } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = formSubmitRequestSchema.parse(body);

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
        clientIp: getClientIp(request),
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
