import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { syncAdAccountAction } from "@/modules/marketing/actions";

export function MarketingAdAccountsPanel({
  accounts,
}: {
  accounts: Array<{
    id: string;
    displayName: string;
    externalAccountId: string;
    accountType: string;
    currency: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    lastSyncAt: Date | null;
    connection: { id: string; providerId: string; status: string };
  }>;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ad Accounts"
        description="Connected advertising accounts with sync status and performance rollups."
      />
      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ad accounts yet. Connect a platform under Advertising Platforms, then sync.
          </p>
        ) : (
          accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {account.displayName}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({account.connection.providerId})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-4">
                  <div>ID: {account.externalAccountId}</div>
                  <div>Currency: {account.currency ?? "—"}</div>
                  <div>Status: {account.connection.status}</div>
                  <div>
                    Last sync:{" "}
                    {account.lastSyncAt ? account.lastSyncAt.toISOString().slice(0, 16) : "—"}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-4 text-muted-foreground">
                  <div>Spend: {account.spend.toFixed(2)}</div>
                  <div>Impressions: {account.impressions}</div>
                  <div>Clicks: {account.clicks}</div>
                  <div>Conversions: {account.conversions}</div>
                </div>
                <form action={syncAdAccountAction} className="flex gap-2">
                  <input type="hidden" name="connectionId" value={account.connection.id} />
                  <input type="hidden" name="providerId" value={account.connection.providerId} />
                  <input type="hidden" name="adAccountId" value={account.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Sync campaigns
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
