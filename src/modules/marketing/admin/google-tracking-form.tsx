"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertTrackingConfigAction } from "@/modules/marketing/actions";

type Props = {
  enabled: boolean;
  pixelId: string | null;
  formId?: string;
};

export function GoogleTrackingForm({
  enabled,
  pixelId,
  formId = "marketing-tracking-google",
}: Props) {
  return (
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
        <form
          id={formId}
          data-admin-save-form=""
          action={upsertTrackingConfigAction}
          className="grid gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="providerId" value="google-ads" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={enabled} />
            Conversion tracking enabled
          </label>
          <input
            name="pixelId"
            defaultValue={pixelId ?? ""}
            placeholder="Google Ads conversion / tag id"
            className="rounded border px-3 py-2 text-sm"
          />
          <Button type="submit" className="w-fit">
            Save Google tracking
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
