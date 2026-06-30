import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canonicalSiteDefaultPresetId } from "@/features/theme/preset-identity";
import { themeRepository } from "@/repositories/theme.repository";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const draft = await themeRepository.getDraft();
  const siteDefaultPresetId = canonicalSiteDefaultPresetId(
    draft && "siteDefaultPresetId" in draft
      ? (draft as { siteDefaultPresetId?: string | null }).siteDefaultPresetId
      : null,
  );
  return NextResponse.json({ siteDefaultPresetId, activePresetId: siteDefaultPresetId });
}
