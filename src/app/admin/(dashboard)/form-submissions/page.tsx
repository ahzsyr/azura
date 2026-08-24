import { listFormSubmissions } from "@/features/forms/form-submission.service";
import { FormSubmissionsPage } from "@/features/forms/admin/form-submissions-page";

export default async function AdminFormSubmissionsPage() {
  let submissions: Awaited<ReturnType<typeof listFormSubmissions>> = [];
  try {
    submissions = await listFormSubmissions();
  } catch {
    // DB not connected
  }
  return <FormSubmissionsPage submissions={submissions} />;
}
