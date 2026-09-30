import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoTaskService } from "@/features/seo/operator/task.service";
import { SeoTaskInbox } from "@/features/seo/operator/components/seo-task-inbox";
import type { SeoTaskSeverity } from "@/features/seo/operator/types";

type Props = {
  searchParams?: Promise<{
    snapshotId?: string;
    severity?: string;
    category?: string;
    source?: string;
    status?: string;
  }>;
};

function asSeverity(value?: string): SeoTaskSeverity | "all" {
  if (value === "critical" || value === "important" || value === "recommended") return value;
  if (value === "warn") return "important";
  if (value === "info") return "recommended";
  return "all";
}

/** Soft destination for /admin/seo/issues — renders Tasks with query preserved. */
export default async function AdminSeoIssuesPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const tasks = await seoTaskService.list();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Tasks"
        description="Issues now live in Tasks. Filters from the old Issues URL still apply."
      />
      <SeoTaskInbox
        tasks={tasks}
        initialSeverity={asSeverity(params.severity)}
        initialSource={params.source}
        initialCategory={params.category}
      />
    </div>
  );
}
