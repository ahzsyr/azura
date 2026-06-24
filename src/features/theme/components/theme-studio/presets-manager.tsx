"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Download, Pencil, RotateCcw, Search, Upload } from "lucide-react";
import { ALL_PRESETS, type PresetCatalogItem } from "@/features/theme/presets-catalog";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeColorPicker, ThemeSectionCard } from "./controls";

const DEFAULT_PRESET_KEY = "__default__";

type SemanticColorDraft = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
};

type Props = {
  siteDefaultPresetId: string | null;
  themeProvenance?: {
    sourcePresetId?: string | null;
    customizedAfterPreset?: boolean;
  } | null;
  onApplyPreset: (presetId: string) => void;
  onApplyPresetAsDefault?: (presetId: string) => Promise<void>;
  onDuplicatePreset: (presetId: string) => void;
  onApplyPresetColors: (presetId: string | null, colors: PresetColorTokens) => void;
  onApplyDefaultTheme: () => void;
  onDuplicateDefaultTheme: () => void;
  defaultThemeColors: PresetColorTokens;
  exportJson: () => string;
  onImportJson: (json: string) => void;
};

export function PresetsManager({
  siteDefaultPresetId,
  themeProvenance,
  onApplyPreset,
  onApplyPresetAsDefault,
  onDuplicatePreset,
  onApplyPresetColors,
  onApplyDefaultTheme,
  onDuplicateDefaultTheme,
  defaultThemeColors,
  exportJson,
  onImportJson,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null);
  const [duplicatedIds, setDuplicatedIds] = useState<Set<string>>(new Set());
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [colorDrafts, setColorDrafts] = useState<Record<string, SemanticColorDraft>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_PRESETS;
    return ALL_PRESETS.filter(
      (p) =>
        p.id.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [query]);

  function fallbackColor(value: string | undefined, fallback: string) {
    return value?.trim() || fallback;
  }

  function draftFromPreset(preset: PresetCatalogItem): SemanticColorDraft {
    const primary = preset.tokens.primary;
    const accent = preset.tokens.accent ?? primary;
    return {
      primary,
      accent,
      background: fallbackColor(preset.tokens.background, "#ffffff"),
      surface: fallbackColor(preset.tokens.surface, preset.tokens.background || "#ffffff"),
      text: fallbackColor(preset.tokens.text, "#111827"),
      textMuted: fallbackColor(preset.tokens.textMuted, "#6b7280"),
    };
  }

  function draftFromPresetColors(colors: PresetColorTokens): SemanticColorDraft {
    return {
      primary: colors.primary,
      accent: colors.accent,
      background: fallbackColor(colors.background, "#ffffff"),
      surface: fallbackColor(colors.surface, colors.background || "#ffffff"),
      text: fallbackColor(colors.text, "#111827"),
      textMuted: fallbackColor(colors.textMuted, "#6b7280"),
    };
  }

  function toPresetColors(draft: SemanticColorDraft): PresetColorTokens {
    return {
      primary: draft.primary,
      accent: draft.accent,
      background: draft.background,
      surface: draft.surface,
      text: draft.text,
      textMuted: draft.textMuted,
    };
  }

  function markDuplicated(key: string, draft: SemanticColorDraft) {
    setDuplicatedIds((prev) => new Set(prev).add(key));
    setColorDrafts((prev) => ({ ...prev, [key]: prev[key] ?? draft }));
  }

  async function applyPreset(presetId: string) {
    const preset = ALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onApplyPreset(presetId);
    if (!onApplyPresetAsDefault) {
      setStatus(`Applied "${preset.label}" to the editor.`);
      return;
    }
    setApplyingPresetId(presetId);
    try {
      await onApplyPresetAsDefault(presetId);
      setStatus(`Applied and published "${preset.label}" as the default website preset.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to apply preset as website default.");
    } finally {
      setApplyingPresetId(null);
    }
  }

  function duplicatePreset(presetId: string) {
    const preset = ALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onDuplicatePreset(presetId);
    markDuplicated(presetId, draftFromPreset(preset));
    setStatus(`Duplicated "${preset.label}" into an editable copy.`);
  }

  function editPreset(presetId: string) {
    const preset = ALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (!duplicatedIds.has(presetId)) {
      onDuplicatePreset(presetId);
      markDuplicated(presetId, draftFromPreset(preset));
      setStatus(`Duplicated "${preset.label}" into an editable copy.`);
    }
    setEditingPresetId((current) => (current === presetId ? null : presetId));
  }

  function applyDefaultTheme() {
    onApplyDefaultTheme();
    setStatus("Applied default website theme settings to the editor.");
  }

  function duplicateDefaultTheme() {
    onDuplicateDefaultTheme();
    markDuplicated(DEFAULT_PRESET_KEY, draftFromPresetColors(defaultThemeColors));
    setStatus("Duplicated default website theme into an editable copy.");
  }

  function editDefaultTheme() {
    if (!duplicatedIds.has(DEFAULT_PRESET_KEY)) {
      onDuplicateDefaultTheme();
      markDuplicated(DEFAULT_PRESET_KEY, draftFromPresetColors(defaultThemeColors));
      setStatus("Duplicated default website theme into an editable copy.");
    }
    setEditingPresetId((current) => (current === DEFAULT_PRESET_KEY ? null : DEFAULT_PRESET_KEY));
  }

  function updateColorDraft(
    key: string,
    field: keyof SemanticColorDraft,
    value: string,
    presetId: string | null,
    fallbackDraft: SemanticColorDraft,
  ) {
    const next = { ...(colorDrafts[key] ?? fallbackDraft), [field]: value };
    setColorDrafts((prev) => ({ ...prev, [key]: next }));
    onApplyPresetColors(presetId, toPresetColors(next));
  }

  function downloadExport() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Theme JSON exported.");
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportJson(String(reader.result));
        setStatus("Theme JSON imported into the editor.");
      } catch {
        setStatus("Invalid theme JSON file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <ThemeSectionCard
        title="Preset gallery"
        description="Industry presets update colors, effects, and surface styles in the live editor."
        searchTerms={["preset", "template", "industry"]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadExport}>
              <Download className="me-1 size-3.5" />
              Export
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="me-1 size-3.5" />
              Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={applyDefaultTheme}>
              <RotateCcw className="me-1 size-3.5" />
              Apply default website theme
            </Button>
          </div>
        }
      >
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search presets…"
            className="pl-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div
            className={`flex h-full flex-col rounded-xl border p-4 text-left transition hover:border-primary ${
              !siteDefaultPresetId ? "border-primary ring-2 ring-primary/20" : "bg-card"
            }`}
            data-theme-search="default website theme"
          >
            <div className="mb-3 h-14 rounded-lg bg-gradient-to-r from-emerald-700 to-amber-500" />
            <div className="flex items-start gap-2">
              <span>🌐</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">Default website theme</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  Reapply the current website base theme (colors, background, effects, card/border style).
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" className="h-7 text-xs" onClick={applyDefaultTheme}>
                Apply
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={duplicateDefaultTheme}>
                <Copy className="me-1 size-3" />
                Duplicate
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={editDefaultTheme}>
                <Pencil className="me-1 size-3" />
                Edit
              </Button>
            </div>
            {editingPresetId === DEFAULT_PRESET_KEY ? (
              <SemanticColorEditor
                draft={colorDrafts[DEFAULT_PRESET_KEY] ?? draftFromPresetColors(defaultThemeColors)}
                onChange={(field, value) =>
                  updateColorDraft(
                    DEFAULT_PRESET_KEY,
                    field,
                    value,
                    null,
                    draftFromPresetColors(defaultThemeColors),
                  )
                }
              />
            ) : null}
          </div>
          {filtered.map((preset) => (
            <div
              key={preset.id}
              className={`flex h-full flex-col rounded-xl border p-4 text-left transition hover:border-primary ${
                siteDefaultPresetId === preset.id ? "border-primary ring-2 ring-primary/20" : "bg-card"
              }`}
              data-theme-search={`${preset.label} ${preset.description} preset`}
            >
              <div className="w-full text-left">
                <div
                  className="mb-3 h-14 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${preset.tokens.primary}, ${preset.tokens.accent || preset.tokens.primary})`,
                  }}
                />
                <div className="flex items-start gap-2">
                  <span>{preset.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{preset.label}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={applyingPresetId === preset.id}
                  onClick={() => void applyPreset(preset.id)}
                >
                  {applyingPresetId === preset.id ? "Applying..." : "Apply"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => duplicatePreset(preset.id)}
                >
                  <Copy className="me-1 size-3" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => editPreset(preset.id)}
                >
                  <Pencil className="me-1 size-3" />
                  Edit
                </Button>
              </div>
              {editingPresetId === preset.id ? (
                <SemanticColorEditor
                  draft={colorDrafts[preset.id] ?? draftFromPreset(preset)}
                  onChange={(field, value) =>
                    updateColorDraft(preset.id, field, value, preset.id, draftFromPreset(preset))
                  }
                />
              ) : null}
            </div>
          ))}
        </div>
        {siteDefaultPresetId ? (
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>
              Based on preset: <strong>{themeProvenance?.sourcePresetId ?? siteDefaultPresetId}</strong>
            </p>
            <p>
              Status:{" "}
              <strong>{themeProvenance?.customizedAfterPreset ? "Customized" : "Matches preset"}</strong>
            </p>
          </div>
        ) : null}
        {status ? <p className="mt-2 text-sm text-muted-foreground">{status}</p> : null}
      </ThemeSectionCard>
    </div>
  );
}

function SemanticColorEditor({
  draft,
  onChange,
}: {
  draft: SemanticColorDraft;
  onChange: (field: keyof SemanticColorDraft, value: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium">Edit semantic colors</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ThemeColorPicker
          label="Primary"
          value={draft.primary}
          onChange={(value) => onChange("primary", value)}
        />
        <ThemeColorPicker
          label="Accent"
          value={draft.accent}
          onChange={(value) => onChange("accent", value)}
        />
        <ThemeColorPicker
          label="Background"
          value={draft.background}
          onChange={(value) => onChange("background", value)}
        />
        <ThemeColorPicker
          label="Surface"
          value={draft.surface}
          onChange={(value) => onChange("surface", value)}
        />
        <ThemeColorPicker
          label="Text"
          value={draft.text}
          onChange={(value) => onChange("text", value)}
        />
        <ThemeColorPicker
          label="Muted text"
          value={draft.textMuted}
          onChange={(value) => onChange("textMuted", value)}
        />
      </div>
    </div>
  );
}
