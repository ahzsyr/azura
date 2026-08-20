import { NextResponse } from "next/server";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { loadFormTemplateTranslations } from "@/features/forms/form-template-translation.service";

export async function GET(
  req: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await context.params;
  const locale = new URL(req.url).searchParams.get("locale") ?? "en";
  try {
    const template = await getFormTemplateById(templateId);
    if (!template || !template.isPublished) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const copy = await loadFormTemplateTranslations(templateId, template.definition, locale);
    return NextResponse.json(copy);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
