import { notFound } from "next/navigation";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { FormDesignerPage } from "@/features/forms/admin/form-designer-page";

type Props = { params: Promise<{ id: string }> };

export default async function EditFormTemplatePage({ params }: Props) {
  const { id } = await params;
  let template = null;
  try {
    template = await getFormTemplateById(id);
  } catch {
    // DB not connected
  }
  if (!template) notFound();

  return (
    <FormDesignerPage
      initial={{
        id: template.id,
        name: template.name,
        slug: template.slug,
        category: template.category,
        description: template.description ?? "",
        isPublished: template.isPublished,
        definition: template.definition,
      }}
    />
  );
}
