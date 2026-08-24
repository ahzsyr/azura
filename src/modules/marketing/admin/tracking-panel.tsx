import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertTrackingConfigAction } from "@/modules/marketing/actions";
import { MetaPixelCodeSetup } from "@/modules/marketing/admin/meta-pixel-code-setup";

type TrackingConfig = {
  id: string;
  providerId: string;
  enabled: boolean;
  pixelId: string | null;
  capiEnabled: boolean;
  testEventCode: string | null;
  metadata?: unknown;
};

export function MarketingTrackingPanel({ configs }: { configs: TrackingConfig[] }) {
  const meta = configs.find((c) => c.providerId === "meta");
  const linkedin = configs.find((c) => c.providerId === "linkedin");
  const google = configs.find((c) => c.providerId === "google-ads");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tracking"
        description="Internal MarketingEvents are the source of truth. GA4, Meta Pixel/CAPI, Google Ads, and LinkedIn are downstream destinations only."
      />

      <MetaPixelCodeSetup config={meta ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>Google Ads / GA4 / GTM</CardTitle>
          <CardDescription>
            Site GA4/GTM install remains in SEO settings. Marketing events push to dataLayer via the
            internal event dispatcher when tracking is enabled. Configure Google Ads conversion
            actions under Advertising Platforms metadata (developer token / customer id).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertTrackingConfigAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="providerId" value="google-ads" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={google?.enabled ?? false} />
              Conversion tracking enabled
            </label>
            <input
              name="pixelId"
              defaultValue={google?.pixelId ?? ""}
              placeholder="Google Ads conversion / tag id"
              className="rounded border px-3 py-2 text-sm"
            />
            <Button type="submit" className="w-fit">
              Save Google tracking
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Insight Tag</CardTitle>
          <CardDescription>Partner ID stored as pixelId for LinkedIn Insight Tag injection.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertTrackingConfigAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="providerId" value="linkedin" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={linkedin?.enabled ?? false} />
              Insight Tag enabled
            </label>
            <input
              name="pixelId"
              defaultValue={linkedin?.pixelId ?? ""}
              placeholder="LinkedIn Partner ID"
              className="rounded border px-3 py-2 text-sm"
            />
            <Button type="submit" className="w-fit">
              Save LinkedIn tracking
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
