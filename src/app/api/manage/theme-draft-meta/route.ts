import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { canonicalSiteDefaultPresetId } from "@/features/theme/preset-identity";
import { themeRepository } from "@/repositories/theme.repository";

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async () => {
    const draft = await themeRepository.getDraft();
    const siteDefaultPresetId = canonicalSiteDefaultPresetId(
      draft && "siteDefaultPresetId" in draft
        ? (draft as { siteDefaultPresetId?: string | null }).siteDefaultPresetId
        : null,
    );
    return NextResponse.json({ siteDefaultPresetId, activePresetId: siteDefaultPresetId });
  },
});
