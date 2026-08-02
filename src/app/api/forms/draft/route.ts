import { NextResponse } from "next/server";
import { formDraftSaveSchema } from "@/features/forms/schemas/form-definition";
import "@/features/forms/platform/register-commands.server";
import { commandBus } from "@/platform/schema-ui/pipeline/command-bus";
import type { SaveDraftCommand } from "@/platform/schema-ui/manifests/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = formDraftSaveSchema.parse(body);

    const command: SaveDraftCommand = {
      type: "SaveDraft",
      schemaId: data.templateId,
      token: data.token,
      bindingValues: data.payload,
      currentStep: data.currentStep,
    };

    const result = await commandBus.execute("SaveDraft", command);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Form draft error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
