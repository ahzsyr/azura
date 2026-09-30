import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoTaskService } from "@/features/seo/operator/task.service";
import { getSeoDashboardVm } from "@/features/seo/operator/dashboard.service";
import { SeoWeeklyReview } from "@/features/seo/operator/components/seo-weekly-review";

export default async function AdminSeoTasksWeekPage() {
  const [tasks, dashboard] = await Promise.all([seoTaskService.list(), getSeoDashboardVm()]);
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="This Week"
        description="A wider look at technical health, content, indexing, sitemap, and structured data."
      />
      <SeoWeeklyReview tasks={tasks} dashboard={dashboard} />
    </div>
  );
}
