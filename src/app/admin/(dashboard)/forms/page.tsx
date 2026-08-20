import { listFormTemplates } from "@/features/forms/form-template.service";
import { FormsLibraryPage } from "@/features/forms/admin/forms-library-page";

export default async function AdminFormsPage() {
  let templates: Awaited<ReturnType<typeof listFormTemplates>> = [];
  try {
    templates = await listFormTemplates();
  } catch {
    // DB not connected
  }
  return <FormsLibraryPage templates={templates} />;
}
