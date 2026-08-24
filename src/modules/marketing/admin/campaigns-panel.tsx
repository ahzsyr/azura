import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCampaignAction,
  updateCampaignStatusAction,
  addCampaignBindingAction,
} from "@/modules/marketing/actions";
import type { MarketingCampaignStatus } from "@prisma/client";

type CampaignRow = {
  id: string;
  internalId: string;
  name: string;
  status: MarketingCampaignStatus;
  channel: string | null;
  landingPagePath: string | null;
  budget: number | null;
  budgetCurrency: string | null;
  providerBindings: Array<{ id: string; providerId: string; externalCampaignName: string | null; syncStatus: string }>;
  _count: { trackingUrls: number; conversions: number };
};

export function MarketingCampaignsPanel({
  campaigns,
  adAccounts,
}: {
  campaigns: CampaignRow[];
  adAccounts: Array<{ id: string; displayName: string; connection: { providerId: string } }>;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campaigns"
        description="Internal marketing campaigns are the business master. Link Meta, Google Ads, or LinkedIn executions via provider bindings."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCampaignAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Enterprise Wireless – UAE – Q4 2026" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective">Objective</Label>
              <Input id="objective" name="objective" placeholder="Leads / Awareness / Traffic" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="channel">Channel</Label>
              <Input id="channel" name="channel" placeholder="paid_social / search / email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="landingPagePath">Landing page path</Label>
              <Input id="landingPagePath" name="landingPagePath" placeholder="/solutions/enterprise-wireless" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" name="budget" type="number" step="0.01" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create campaign</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaigns yet. Create the first internal campaign above.</p>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {campaign.internalId} · {campaign.status}
                      {campaign.landingPagePath ? ` · ${campaign.landingPagePath}` : ""}
                    </p>
                  </div>
                  <form action={updateCampaignStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={campaign.id} />
                    <select
                      name="status"
                      defaultValue={campaign.status}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Update
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-3 text-muted-foreground">
                  <span>{campaign._count.trackingUrls} tracking URLs</span>
                  <span>{campaign._count.conversions} conversions</span>
                  <span>
                    Budget:{" "}
                    {campaign.budget != null
                      ? `${campaign.budget} ${campaign.budgetCurrency ?? ""}`
                      : "—"}
                  </span>
                </div>
                <div>
                  <p className="mb-2 font-medium">Provider bindings</p>
                  {campaign.providerBindings.length === 0 ? (
                    <p className="text-muted-foreground">No platform campaigns linked yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {campaign.providerBindings.map((b) => (
                        <li key={b.id} className="rounded border px-2 py-1">
                          {b.providerId}
                          {b.externalCampaignName ? ` · ${b.externalCampaignName}` : ""} · {b.syncStatus}
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={addCampaignBindingAction} className="mt-3 grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <select name="providerId" className="h-9 rounded-md border bg-background px-2 text-sm" required>
                      <option value="meta">Meta</option>
                      <option value="google-ads">Google Ads</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                    <select name="adAccountId" className="h-9 rounded-md border bg-background px-2 text-sm">
                      <option value="">Ad account (optional)</option>
                      {adAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.connection.providerId}: {a.displayName}
                        </option>
                      ))}
                    </select>
                    <Input name="externalCampaignId" placeholder="External campaign ID" />
                    <Input name="externalCampaignName" placeholder="External campaign name" />
                    <Button type="submit" size="sm" className="md:col-span-4 w-fit">
                      Add binding
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
