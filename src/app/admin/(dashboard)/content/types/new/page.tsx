import { ContentTypeForm } from "@/features/content/admin/content-type-form";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { ContentAdminTabs } from "@/features/content/admin/content-admin-tabs";

export default function NewContentTypePage() {
  return (
    <div className="space-y-6">
      <ContentAdminTabs />
      <AdminPageHeader title="New content type" description="Create a custom catalog type with its own fields and URL prefix." />
      <ContentTypeForm isNew />
    </div>
  );
}
