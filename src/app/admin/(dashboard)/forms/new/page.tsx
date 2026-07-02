import { FormDesignerPage } from "@/features/forms/admin/form-designer-page";

export default function NewFormTemplatePage() {
  return (
    <FormDesignerPage
      initial={{
        id: null,
        name: "Untitled Form",
        slug: "untitled-form",
        category: "GENERAL",
        description: "",
        isPublished: false,
        definition: { fields: [], notifications: { adminEmails: [], sendToSubmitter: false } },
      }}
    />
  );
}
