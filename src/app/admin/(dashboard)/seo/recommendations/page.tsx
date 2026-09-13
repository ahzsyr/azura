import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoTaskService } from "@/features/seo/operator/task.service";
import { SeoTaskInbox } from "@/features/seo/operator/components/seo-task-inbox";

/** Soft destination for /admin/seo/recommendations. */
export default async function AdminSeoRecommendationsPage() {
  const tasks = await seoTaskService.list();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Tasks"
        description="Recommendations are now part of Tasks."
      />
      <SeoTaskInbox tasks={tasks} initialSource="recommendation" />
    </div>
  );
}
