"use client";

import type { CatalogEntityKind } from "@/features/catalog/types";
import {
  DEFAULT_DISPLAY_SETTINGS,
  type DisplaySettings,
} from "@/schemas/catalog/display-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EntityDisplaySettingsPanelProps = {
  value: Partial<DisplaySettings>;
  onChange: (next: Partial<DisplaySettings>) => void;
  source?: CatalogEntityKind | "packages" | "hotels" | "services";
  showPreview?: boolean;
  className?: string;
};

const CARD_VARIANTS = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
  { value: "minimal", label: "Minimal" },
  { value: "featured", label: "Featured" },
] as const;

export function EntityDisplaySettingsPanel({
  value,
  onChange,
  source = "packages",
  showPreview = false,
  className,
}: EntityDisplaySettingsPanelProps) {
  const settings = { ...DEFAULT_DISPLAY_SETTINGS, ...value };
  const isPackage = source === "package" || source === "packages";
  const isHotel = source === "hotel" || source === "hotels";
  const isService = source === "service" || source === "services";

  const set = <K extends keyof DisplaySettings>(key: K, val: DisplaySettings[K]) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <Label>Card variant</Label>
        <div className="flex flex-wrap gap-2">
          {CARD_VARIANTS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => set("cardVariant", v.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                settings.cardVariant === v.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Layout</Label>
          <select
            className="flex h-10 w-full rounded-lg border px-3 text-sm"
            value={settings.layoutMode}
            onChange={(e) => set("layoutMode", e.target.value as DisplaySettings["layoutMode"])}
          >
            <option value="grid">Grid</option>
            <option value="slider">Slider</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <select
            className="flex h-10 w-full rounded-lg border px-3 text-sm"
            value={settings.columns}
            onChange={(e) => set("columns", Number(e.target.value) as DisplaySettings["columns"])}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Item limit</Label>
          <Input
            type="number"
            min={1}
            value={settings.limit}
            onChange={(e) => set("limit", Number(e.target.value))}
          />
        </div>
        {settings.layoutMode === "slider" && (
          <div className="space-y-2">
            <Label>Autoplay interval (ms)</Label>
            <Input
              type="number"
              min={1000}
              value={settings.autoplayIntervalMs}
              onChange={(e) => set("autoplayIntervalMs", Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Display options</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { key: "showViewAllLink" as const, label: "Show view all link" },
            { key: "showExcerpt" as const, label: "Show excerpt" },
            ...(isPackage
              ? [
                  { key: "showPrice" as const, label: "Show price" },
                  { key: "showDuration" as const, label: "Show duration" },
                  { key: "showCategory" as const, label: "Show category" },
                ]
              : []),
            ...(isHotel
              ? [
                  { key: "showStars" as const, label: "Show stars" },
                  { key: "showCity" as const, label: "Show city" },
                ]
              : []),
            ...(isService ? [{ key: "showIcon" as const, label: "Show icon" }] : []),
            ...(settings.layoutMode === "slider"
              ? [{ key: "autoplay" as const, label: "Autoplay slider" }]
              : []),
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) => set(key, e.target.checked as DisplaySettings[typeof key])}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {showPreview && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Preview: {settings.cardVariant} · {settings.layoutMode} · {settings.columns} cols
        </div>
      )}
    </div>
  );
}

export { DEFAULT_DISPLAY_SETTINGS };
