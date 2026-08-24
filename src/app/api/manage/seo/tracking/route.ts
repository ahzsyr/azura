import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { upsertSeoTrackingConfig } from "@/features/seo/tracking/upsert-tracking.server";
import type { SeoTrackingMode } from "@/features/seo/types";

type TrackingBody = {
  mode?: SeoTrackingMode;
  gtagEnabled?: boolean;
  gtmEnabled?: boolean;
  enabled?: boolean;
  measurementId?: string;
  gtmContainerId?: string;
  gtagHeadSnippet?: string;
  gtmHeadSnippet?: string;
  gtmBodySnippet?: string;
};

export const POST = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => {
    try {
      const body = (await request.json()) as TrackingBody;
      await upsertSeoTrackingConfig({
        mode: body.mode === "gtm" ? "gtm" : "gtag",
        gtagEnabled: body.gtagEnabled,
        gtmEnabled: body.gtmEnabled,
        enabled: body.enabled,
        measurementId: body.measurementId,
        gtmContainerId: body.gtmContainerId,
        gtagHeadSnippet: body.gtagHeadSnippet,
        gtmHeadSnippet: body.gtmHeadSnippet,
        gtmBodySnippet: body.gtmBodySnippet,
        includeMeasurementId: body.measurementId !== undefined,
        includeGtmContainerId: body.gtmContainerId !== undefined,
        includeGtagHeadSnippet: body.gtagHeadSnippet !== undefined,
        includeGtmHeadSnippet: body.gtmHeadSnippet !== undefined,
        includeGtmBodySnippet: body.gtmBodySnippet !== undefined,
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
});
