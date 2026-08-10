import { listFormTemplates } from "@/features/forms/form-template.service";

/** Thin surveys consumer — reuses FormTemplate with SURVEY category. */
export async function listSurveyTemplates() {
  return listFormTemplates("SURVEY");
}

export { getFormTemplateById as getSurveyTemplateById } from "@/features/forms/form-template.service";
