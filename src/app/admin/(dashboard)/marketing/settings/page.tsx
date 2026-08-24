import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getOrCreateRetentionPolicy,
} from "@/modules/marketing/privacy/retention";
import {
  runRetentionPurgeAction,
  updateRetentionPolicyAction,
} from "@/modules/marketing/actions";

export const dynamic = "force-dynamic";

export default async function AdminMarketingSettingsPage() {
  const policy = await getOrCreateRetentionPolicy().catch(() => null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketing Settings"
        description="Retention and privacy controls for anonymous visitor analytics. Consent: no site-wide banner found — capture defaults to GRANTED unless NEXT_PUBLIC_MARKETING_REQUIRE_CONSENT=1."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data retention (days)</CardTitle>
        </CardHeader>
        <CardContent>
          {policy ? (
            <form action={updateRetentionPolicyAction} className="grid gap-3 md:grid-cols-3">
              {(
                [
                  ["visitorDays", "Visitors", policy.visitorDays],
                  ["sessionDays", "Sessions", policy.sessionDays],
                  ["touchDays", "Touches", policy.touchDays],
                  ["eventDays", "Events", policy.eventDays],
                  ["leadDays", "Leads", policy.leadDays],
                  ["providerPayloadDays", "Provider payloads", policy.providerPayloadDays],
                ] as const
              ).map(([name, label, value]) => (
                <div key={name} className="space-y-1">
                  <Label htmlFor={name}>{label}</Label>
                  <Input id={name} name={name} type="number" defaultValue={value} />
                </div>
              ))}
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit">Save retention policy</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Retention table unavailable until migrations are applied.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deletion / anonymization</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={runRetentionPurgeAction}>
            <Button type="submit" variant="destructive">
              Run retention purge now
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
