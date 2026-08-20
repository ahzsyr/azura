import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertTrackingConfigAction } from "@/modules/marketing/actions";

type TrackingConfig = {
  id: string;
  providerId: string;
  enabled: boolean;
  pixelId: string | null;
  capiEnabled: boolean;
  testEventCode: string | null;
};

export function MarketingTrackingPanel({ configs }: { configs: TrackingConfig[] }) {
  const meta = configs.find((c) => c.providerId === "meta");
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tracking"
        description="Provider-independent tracking events are dispatched to connected providers (Meta Pixel/CAPI first)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Meta Pixel + Conversions API</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertTrackingConfigAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="providerId" value="meta" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={meta?.enabled ?? false} />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="capiEnabled" defaultChecked={meta?.capiEnabled ?? false} />
              CAPI enabled
            </label>
            <input
              name="pixelId"
              defaultValue={meta?.pixelId ?? ""}
              placeholder="Pixel ID"
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              name="testEventCode"
              defaultValue={meta?.testEventCode ?? ""}
              placeholder="Test event code"
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              name="accessToken"
              type="password"
              placeholder="CAPI access token (leave blank to keep)"
              className="md:col-span-2 rounded border px-3 py-2 text-sm"
            />
            <Button type="submit" className="w-fit">Save tracking config</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
