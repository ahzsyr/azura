import { NextResponse } from "next/server";
import { formSubmitRequestSchema } from "@/features/forms/schemas/form-definition";
import { submitForm } from "@/features/forms/form-submission.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = formSubmitRequestSchema.parse(body);
    const result = await submitForm(
      {
        templateId: data.templateId,
        blockType: data.blockType,
        blockId: data.blockId,
        pageId: data.pageId,
        pageSlug: data.pageSlug,
        locale: data.locale,
        utm: data.utm,
      },
      data.payload,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Form submit error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
