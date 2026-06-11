"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Download, RotateCcw, Search, Upload } from "lucide-react";
import { ALL_PRESETS } from "@/features/theme/presets-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSectionCard } from "./controls";

type Props = {
  activePresetId: string | null;
  onApplyPreset: (presetId: string) => void;
  onResetPreset: () => void;
  exportJson: () => string;
  onImportJson: (json: string) => void;
};

export function PresetsManager({
  activePresetId,
  onApplyPreset,
  onResetPreset,
  exportJson,
  onImportJson,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
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

  function duplicatePreset(presetId: string) {
    const preset = ALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onApplyPreset(presetId);
    setStatus(`Duplicated "${preset.label}" into the editor — save draft when ready.`);
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
            <Button type="button" variant="outline" size="sm" onClick={onResetPreset}>
              <RotateCcw className="me-1 size-3.5" />
              Reset preset
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
          {filtered.map((preset) => (
            <div
              key={preset.id}
              className={`rounded-xl border p-4 text-left transition hover:border-primary ${
                activePresetId === preset.id ? "border-primary ring-2 ring-primary/20" : "bg-card"
              }`}
              data-theme-search={`${preset.label} ${preset.description} preset`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  onApplyPreset(preset.id);
                  setStatus(`Applied "${preset.label}" to the editor.`);
                }}
              >
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
              </button>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => duplicatePreset(preset.id)}
                >
                  <Copy className="me-1 size-3" />
                  Duplicate
                </Button>
              </div>
            </div>
          ))}
        </div>
        {activePresetId ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Active in editor: <strong>{activePresetId}</strong>
          </p>
        ) : null}
        {status ? <p className="mt-2 text-sm text-muted-foreground">{status}</p> : null}
      </ThemeSectionCard>
    </div>
  );
}
