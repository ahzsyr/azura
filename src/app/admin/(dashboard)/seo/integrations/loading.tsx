import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";

export default function SeoIntegrationsLoading() {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <AdminPageHeader
          className="mb-0 mt-2"
          title="SEO integrations"
          description="Configure IndexNow, Bing, and Google Indexing API submissions and monitor the outbound SEO queue."
        />
      </div>
      <div className="h-10 animate-pulse rounded-lg border bg-muted/40" />
      <div className="space-y-4">
        <div className="h-9 w-80 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-72 animate-pulse rounded-xl border bg-muted/30" />
      </div>
    </div>
  );
}
