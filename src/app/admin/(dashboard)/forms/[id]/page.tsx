import { notFound } from "next/navigation";
import { FormDesignerPage } from "@/features/forms/admin/form-designer-page";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { listFormTemplateSnapshots } from "@/features/forms/form-template-snapshot.service";
import { listAdminAssignees } from "@/features/forms/admin-users.service";

type Props = { params: Promise<{ id: string }> };

export default async function EditFormTemplatePage({ params }: Props) {
  const { id } = await params;
  let template = null;
  let snapshots: Awaited<ReturnType<typeof listFormTemplateSnapshots>> = [];
  let assignees: Awaited<ReturnType<typeof listAdminAssignees>> = [];
  try {
    [template, snapshots, assignees] = await Promise.all([
      getFormTemplateById(id),
      listFormTemplateSnapshots(id),
      listAdminAssignees(),
    ]);
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
        publishedVersion: template.publishedVersion,
        definition: template.definition,
        schemaDocument: template.schemaDocument,
        extensions: template.extensions,
        meta: template.meta,
      }}
      snapshots={snapshots.map((s) => ({
        id: s.id,
        version: s.version,
        label: s.label,
        publishedAt: s.publishedAt,
      }))}
      assignees={assignees}
    />
  );
}
