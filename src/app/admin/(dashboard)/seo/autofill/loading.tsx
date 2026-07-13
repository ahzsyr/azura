import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";

export default function AdminSeoAutofillLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title="Auto-fill"
        description="Single and bulk SEO metadata generation from shared content snapshots."
      />
      <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
