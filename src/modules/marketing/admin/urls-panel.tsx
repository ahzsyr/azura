"use client";

import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminServerFormTopBarActions } from "@/components/admin/layout/admin-server-form-top-bar-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTrackingUrlAction } from "@/modules/marketing/actions";

export function MarketingUrlsPanel({
  urls,
  campaigns,
}: {
  urls: Array<{
    id: string;
    fullUrl: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    label: string | null;
    campaign: { name: string };
  }>;
  campaigns: Array<{ id: string; name: string; internalId: string }>;
}) {
  return (
    <div className="space-y-6">
      <AdminServerFormTopBarActions
        formId="marketing-url-builder-form"
        ownerKey="marketing-urls"
        saveLabel="Create tracking URL"
      />
      <AdminPageHeader
        title="UTM & Campaign URLs"
        description="Additional or variant tracking URLs for campaigns. Share links use the short form /a?identifier. Create the campaign on Campaigns; use this page for extra landing variants."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL builder</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="marketing-url-builder-form"
            data-admin-save-form=""
            action={createTrackingUrlAction}
            className="grid gap-3 md:grid-cols-2"
          >
            <div className="space-y-1.5 md:col-span-2">
              <Label>Campaign</Label>
              <select name="campaignId" required className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.internalId})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="baseUrl">Base URL / landing path</Label>
              <Input id="baseUrl" name="baseUrl" required placeholder="/solutions/enterprise-wireless" />
            </div>
            <Input name="utmSource" placeholder="utm_source (e.g. facebook)" />
            <Input name="utmMedium" placeholder="utm_medium (e.g. paid_social)" />
            <Input name="utmCampaign" placeholder="utm_campaign (defaults to internal id)" />
            <Input name="utmContent" placeholder="utm_content" />
            <Input name="utmTerm" placeholder="utm_term" />
            <Input name="label" placeholder="Label" />
            <div className="md:col-span-2">
              <Button type="submit">Create tracking URL</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {urls.length === 0 ? (
            <p className="text-muted-foreground">No tracking URLs yet.</p>
          ) : (
            urls.map((u) => (
              <div key={u.id} className="rounded border p-2">
                <div className="font-medium">{u.label ?? u.campaign.name}</div>
                <code className="break-all text-xs">{u.fullUrl}</code>
                <div className="mt-1 text-muted-foreground">
                  {[u.utmSource, u.utmMedium, u.utmCampaign].filter(Boolean).join(" / ")}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
