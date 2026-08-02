import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketingAnalyticsPanel({
  rows,
}: {
  rows: Array<{
    id: string;
    providerId: string;
    accountId: string;
    metric: string;
    value: number;
    periodStart: Date;
    periodEnd: Date;
  }>;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        description="Canonical analytics snapshots normalized from Meta, LinkedIn, and future providers."
      />
      <Card>
        <CardHeader><CardTitle>Snapshots</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analytics snapshots yet.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded border px-3 py-2 text-sm">
                <div className="font-medium">
                  {row.providerId} · {row.metric} · {row.value}
                </div>
                <div className="text-muted-foreground">
                  account {row.accountId} · {row.periodStart.toISOString()} → {row.periodEnd.toISOString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
