import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketingCampaignsPanel() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campaigns"
        description="Campaign orchestration placeholder for future advertising and multi-channel campaigns."
      />
      <Card>
        <CardHeader><CardTitle>Coming next</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Campaign entities will compose publish jobs, tracking events, and analytics snapshots once
          advertising capabilities are enabled.
        </CardContent>
      </Card>
    </div>
  );
}
