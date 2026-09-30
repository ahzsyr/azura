import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { ContentAuditClient } from "@/features/seo/workspace/components/content-audit-client";

export default function AdminSeoContentAuditPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Content Audit"
        description="Analyze content structure, metadata previews, and SEO issues for any Audit Target."
      />
      <ContentAuditClient />
    </div>
  );
}
