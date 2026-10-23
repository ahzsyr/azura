import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { isCapabilityEnabled } from "@/config/deployment-profile";
import {
  personalizationService,
  type PersonalizationSettings,
} from "@/capabilities/personalization/personalization.service";

const capabilityDisabled = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** Admin-only: returns the full personalization configuration. */
export const GET = defineApiRoute({
  access: "admin",
  handler: async () => {
    if (!isCapabilityEnabled("personalization")) return capabilityDisabled();
    try {
      const settings = await personalizationService.get();
      return NextResponse.json(settings);
    } catch (e) {
      console.error("[personalization-settings] load failed", e instanceof Error ? e.name : "unknown");
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }
  },
});

export const POST = defineApiRoute({
  access: "admin",
  handler: async ({ request }) => {
    if (!isCapabilityEnabled("personalization")) return capabilityDisabled();
    try {
      const body = (await request.json()) as PersonalizationSettings;
      const saved = await personalizationService.save(body);
      return NextResponse.json({ saved: true, settings: saved });
    } catch (e) {
      console.error("[personalization-settings] save failed", e instanceof Error ? e.name : "unknown");
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
  },
});
