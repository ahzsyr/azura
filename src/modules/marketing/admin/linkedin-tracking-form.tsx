"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertTrackingConfigAction } from "@/modules/marketing/actions";

type Props = {
  enabled: boolean;
  pixelId: string | null;
  formId?: string;
};

export function LinkedInTrackingForm({
  enabled,
  pixelId,
  formId = "marketing-tracking-linkedin",
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LinkedIn Insight Tag</CardTitle>
        <CardDescription>Partner ID stored as pixelId for LinkedIn Insight Tag injection.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id={formId}
          data-admin-save-form=""
          action={upsertTrackingConfigAction}
          className="grid gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="providerId" value="linkedin" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={enabled} />
            Insight Tag enabled
          </label>
          <input
            name="pixelId"
            defaultValue={pixelId ?? ""}
            placeholder="LinkedIn Partner ID"
            className="rounded border px-3 py-2 text-sm"
          />
          <Button type="submit" className="w-fit">
            Save LinkedIn tracking
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
