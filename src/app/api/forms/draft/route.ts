import { NextResponse } from "next/server";
import { formDraftSaveSchema } from "@/features/forms/schemas/form-definition";
import { saveFormDraft } from "@/features/forms/form-submission.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = formDraftSaveSchema.parse(body);
    const draft = await saveFormDraft(data);
    return NextResponse.json({ success: true, token: draft.token, currentStep: draft.currentStep });
  } catch (error) {
    console.error("Form draft error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
