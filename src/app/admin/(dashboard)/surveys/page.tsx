import { listSurveyTemplates } from "@/features/surveys/survey-template.service";
import { SurveysLibraryPage } from "@/features/surveys/admin/surveys-library-page";

export default async function AdminSurveysPage() {
  const templates = await listSurveyTemplates();
  return <SurveysLibraryPage templates={templates} />;
}
