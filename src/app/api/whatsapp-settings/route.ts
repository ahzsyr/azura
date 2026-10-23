import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";
import type { WhatsAppSettings } from "@/features/whatsapp/whatsapp.schema";

/** Both handlers are admin-only: the payload is admin configuration. */
export const GET = defineApiRoute({
  access: "admin",
  handler: async () => {
    try {
      const settings = await whatsappService.get();
      return NextResponse.json(settings);
    } catch (e) {
      console.error("[whatsapp-settings] load failed", e instanceof Error ? e.name : "unknown");
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }
  },
});

export const POST = defineApiRoute({
  access: "admin",
  handler: async ({ request }) => {
    try {
      const body = (await request.json()) as WhatsAppSettings;
      const saved = await whatsappService.save(body);
      return NextResponse.json({ saved: true, settings: saved });
    } catch (e) {
      console.error("[whatsapp-settings] save failed", e instanceof Error ? e.name : "unknown");
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
  },
});
