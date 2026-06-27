import { NextResponse } from "next/server";
import { loadPresetJson } from "@/features/theme/preset-resolver.server";
import { resolvePresetVisual, toVisualSnapshot } from "@/features/theme/presets";

/**
 * Public preset payload for visitor personalization — no DB writes.
 * Returns colors, effects, and computed visual tokens for global CSS application.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { presetId?: string };
    const presetId = body.presetId?.trim();
    if (!presetId) {
      return NextResponse.json({ error: "Missing presetId" }, { status: 400 });
    }

    const preset = await loadPresetJson(presetId);
    if (!preset) {
      return NextResponse.json({ error: `Preset "${presetId}" not found` }, { status: 404 });
    }

    const visual = resolvePresetVisual(preset);

    return NextResponse.json({
      success: true,
      preset: { id: preset.id, name: preset.name },
      colors: preset.colors,
      cursor: preset.cursor ?? null,
      backgroundEffect: preset.backgroundEffect ?? null,
      textEffect: preset.textEffect ?? null,
      cardStyle: preset.cardStyle ?? null,
      borderStyle: preset.borderStyle ?? null,
      fonts: preset.fonts ?? null,
      visual: toVisualSnapshot(visual),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to apply preset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
