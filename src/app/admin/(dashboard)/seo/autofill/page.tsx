import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminAutofillHub } from "@/features/seo/admin/admin-autofill-hub";

export default function AdminSeoAutofillPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title="Auto-fill"
        description="Single and bulk SEO metadata generation from shared content snapshots."
      />
      <AdminAutofillHub />
    </div>
  );
}
