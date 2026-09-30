import { FormDesignerPage } from "@/features/forms/admin/form-designer-page";
import { defaultDocumentForCategory } from "@/features/forms/lib/document-envelope";
import { compileRuntimeDefinition } from "@/features/forms/compiler";

export default function NewSurveyTemplatePage() {
  const { document, extensions } = defaultDocumentForCategory("SURVEY");
  const definition = compileRuntimeDefinition(document, extensions);

  return (
    <FormDesignerPage
      initial={{
        id: null,
        name: "Untitled Survey",
        slug: "untitled-survey",
        category: "SURVEY",
        description: "",
        isPublished: false,
        publishedVersion: null,
        definition,
        schemaDocument: document,
        extensions,
      }}
    />
  );
}
