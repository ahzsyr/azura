"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ALL_PRESETS, type PresetMeta } from "@/features/theme/presets-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPickerField } from "@/components/settings";

type PresetOverrides = {
  primaryColor: string;
  secondaryColor: string;
  cursorEffect: string;
  backgroundEffect: string;
  textEffect: string;
};

function overridesFromPreset(preset: PresetMeta): PresetOverrides {
  return {
    primaryColor: preset.tokens.primary,
    secondaryColor: preset.tokens.accent || preset.tokens.primary,
    cursorEffect: preset.cursor === "none" ? "" : preset.cursor,
    backgroundEffect: preset.bg === "none" ? "" : preset.bg,
    textEffect: preset.text === "none" ? "" : preset.text,
  };
}

export function PresetsAdminGrid() {
  const [activeId, setActiveId] = useState<string>(ALL_PRESETS[0]?.id ?? "travel");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftActiveId, setDraftActiveId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<PresetOverrides>(() =>
    overridesFromPreset(ALL_PRESETS[0] ?? { tokens: { primary: "#047857", accent: "#d4af37" } } as PresetMeta),
  );

  const active = useMemo(
    (): PresetMeta => ALL_PRESETS.find((p) => p.id === activeId) ?? ALL_PRESETS[0],
    [activeId],
  );
  const selectPreset = (presetId: string) => {
    const next = ALL_PRESETS.find((preset) => preset.id === presetId) ?? ALL_PRESETS[0];
    setActiveId(next.id);
    setOverrides(overridesFromPreset(next));
  };

  useEffect(() => {
    fetch("/api/admin/theme-draft-meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { siteDefaultPresetId?: string | null; activePresetId?: string | null } | null) => {
        const presetId = data?.siteDefaultPresetId ?? data?.activePresetId ?? null;
        if (presetId) setDraftActiveId(presetId);
      })
      .catch(() => {});
  }, [status]);

  async function applyPreset(withOverrides = false) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/manage/apply-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: active.id,
          overrides: withOverrides
            ? {
                primaryColor: overrides.primaryColor,
                secondaryColor: overrides.secondaryColor,
                cursorEffect: overrides.cursorEffect || null,
                backgroundEffect: overrides.backgroundEffect || null,
                textEffect: overrides.textEffect || null,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Apply failed");
      setDraftActiveId(active.id);
      setStatus(
        withOverrides
          ? `Saved customized "${data.preset.name}" to theme draft. Publish from Theme when ready.`
          : `Applied "${data.preset.name}" to theme draft. Publish from Theme when ready.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ALL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => selectPreset(preset.id)}
            className={`rounded-xl border p-4 text-left transition hover:border-primary ${
              activeId === preset.id ? "border-primary ring-2 ring-primary/20" : "bg-card"
            }`}
          >
            <div
              className="mb-3 h-16 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${preset.tokens.primary}, ${preset.tokens.accent || preset.tokens.primary})`,
              }}
            />
            <div className="flex items-start gap-2">
              <span>{preset.emoji}</span>
              <div>
                <div className="font-semibold text-sm">{preset.label || preset.name}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border overflow-hidden bg-muted/20">
          <iframe
            key={active.id}
            title={`Preset preview ${active.name}`}
            src={`/preview/preset?id=${encodeURIComponent(active.id)}`}
            className="w-full h-[360px] border-0 bg-background"
          />
        </div>

        {draftActiveId ? (
          <p className="text-xs text-muted-foreground">
            Active on draft: <strong>{draftActiveId}</strong>
            {draftActiveId === active.id ? " (this preset)" : null}
          </p>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customize & apply</CardTitle>
            <CardDescription>Tweak tokens before applying to the theme draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ColorPickerField
                label="Primary"
                value={overrides.primaryColor}
                onChange={(primaryColor) => setOverrides((o) => ({ ...o, primaryColor }))}
              />
              <ColorPickerField
                label="Accent"
                value={overrides.secondaryColor}
                onChange={(secondaryColor) => setOverrides((o) => ({ ...o, secondaryColor }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Cursor effect (optional id)</Label>
              <Input
                value={overrides.cursorEffect}
                placeholder="e.g. ring-dot"
                onChange={(e) => setOverrides((o) => ({ ...o, cursorEffect: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Background effect (optional id)</Label>
              <Input
                value={overrides.backgroundEffect}
                onChange={(e) => setOverrides((o) => ({ ...o, backgroundEffect: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Text effect (optional id)</Label>
              <Input
                value={overrides.textEffect}
                onChange={(e) => setOverrides((o) => ({ ...o, textEffect: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={loading} onClick={() => void applyPreset(false)}>
                {loading ? "Applying…" : "Apply defaults"}
              </Button>
              <Button type="button" disabled={loading} onClick={() => void applyPreset(true)}>
                Save customization to draft
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/theme">Open Theme</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </div>
    </div>
  );
}
