import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoTaskService } from "@/features/seo/operator/task.service";
import { SeoDailyReview } from "@/features/seo/operator/components/seo-daily-review";

export default async function AdminSeoTasksTodayPage() {
  const tasks = await seoTaskService.list();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Today"
        description="A guided review: critical issues, then metadata, then indexing."
      />
      <SeoDailyReview tasks={tasks} />
    </div>
  );
}
