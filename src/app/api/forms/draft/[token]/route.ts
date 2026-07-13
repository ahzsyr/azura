import { NextResponse } from "next/server";
import { loadFormDraft } from "@/features/forms/form-submission.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const draft = await loadFormDraft(token);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    token: draft.token,
    currentStep: draft.currentStep,
    payload: draft.payload,
    templateId: draft.templateId,
  });
}
