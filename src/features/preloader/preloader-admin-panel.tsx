"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  SettingsSection,
  TextField,
  ToggleField,
} from "@/components/admin/settings-fields";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";
import { PreloaderView } from "@/features/preloader/preloader-view";
import { resolveSitePreloader } from "@/features/preloader/resolve-site-preloader";
import {
  PRELOADER_ANIMATIONS,
  PRELOADER_CENTER_TYPES,
  PRELOADER_MODES,
  type SitePreloaderSettings,
} from "@/features/preloader/site-preloader.schema";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";

const MODE_OPTIONS = [
  { value: "both", label: "Both" },
  { value: "initialOnly", label: "Initial load" },
  { value: "navigationOnly", label: "Navigation" },
] as const;

const CENTER_TYPE_OPTIONS = PRELOADER_CENTER_TYPES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const ANIMATION_OPTIONS = PRELOADER_ANIMATIONS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const ICON_OPTIONS = [
  { value: "Loader2", label: "Loader" },
  { value: "Sparkles", label: "Sparkles" },
  { value: "Radio", label: "Radio" },
  { value: "Zap", label: "Zap" },
];

type Props = {
  initialSettings: SitePreloaderSettings;
  themeLogoUrl: string | null;
  brandLogoLightUrl?: string | null;
  brandLogoDarkUrl?: string | null;
};

export function PreloaderAdminPanel({
  initialSettings,
  themeLogoUrl,
  brandLogoLightUrl,
  brandLogoDarkUrl,
}: Props) {
  const [settings, setSettings] = useState<SitePreloaderSettings>(initialSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewSettings = useMemo(
    () =>
      resolveSitePreloader(
        { sitePreloader: settings },
        { themeLogoUrl, brandLogoLightUrl, brandLogoDarkUrl },
      ),
    [settings, themeLogoUrl, brandLogoLightUrl, brandLogoDarkUrl],
  );

  const patch = <K extends keyof SitePreloaderSettings>(key: K, value: SitePreloaderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  async function save() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "sitePreloader",
          value: settings,
          locale: adminLocale.code,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setStatus("Preloader settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
          <CardDescription>Preview updates as you edit settings below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="preloader-preview-frame">
            <PreloaderView settings={previewSettings} variant="preview" logoUrl={themeLogoUrl} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Control when the fullscreen preloader appears on the public site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleField
            label="Enable site preloader"
            description="When disabled, the site uses the default skeleton loading state during navigation."
            checked={settings.enabled}
            onChange={(v) => patch("enabled", v)}
          />
          <div className="space-y-2">
            <Label>When to show</Label>
            <OptionButtonGroup
              value={settings.mode}
              options={MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => patch("mode", v as SitePreloaderSettings["mode"])}
              columns={3}
            />
            <p className="text-xs text-muted-foreground">
              Both covers first visit and internal link navigation. Initial load only hides the shell on first paint.
              Navigation only keeps the normal shell on first visit.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Animation style and center focal content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SettingsSection title="Animation">
            <OptionButtonGroup
              value={settings.animation}
              options={ANIMATION_OPTIONS}
              onChange={(v) => patch("animation", v as SitePreloaderSettings["animation"])}
              columns={4}
            />
          </SettingsSection>

          <SettingsSection title="Center content">
            <OptionButtonGroup
              value={settings.centerType}
              options={CENTER_TYPE_OPTIONS}
              onChange={(v) => patch("centerType", v as SitePreloaderSettings["centerType"])}
              columns={3}
            />
            {settings.centerType === "logo" ? (
              <p className="text-xs text-muted-foreground">
                Uses the published theme logo{themeLogoUrl ? "" : " (no logo set in theme — falls back to text)"}.
              </p>
            ) : null}
            {settings.centerType === "text" ? (
              <TextField
                label="Center text"
                value={settings.centerText}
                onChange={(v) => patch("centerText", v)}
                placeholder="Loading"
              />
            ) : null}
            {settings.centerType === "emoji" ? (
              <TextField
                label="Emoji"
                value={settings.centerEmoji}
                onChange={(v) => patch("centerEmoji", v)}
                placeholder="✨"
              />
            ) : null}
            {settings.centerType === "icon" ? (
              <div className="space-y-2">
                <Label>Icon</Label>
                <OptionButtonGroup
                  value={settings.centerIcon}
                  options={ICON_OPTIONS}
                  onChange={(v) => patch("centerIcon", v)}
                  columns={4}
                />
              </div>
            ) : null}
            {settings.centerType === "svg" ? (
              <TextField
                label="SVG / image URL"
                value={settings.centerSvgUrl}
                onChange={(v) => patch("centerSvgUrl", v)}
                placeholder="/images/logo.svg"
              />
            ) : null}
            <div className="space-y-1.5">
              <TextField
                label="Message (optional)"
                value={settings.message}
                onChange={(v) => patch("message", v)}
                placeholder="Loading experience…"
              />
              <p className="text-xs text-muted-foreground">Shown below the center animation.</p>
            </div>
          </SettingsSection>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colors</CardTitle>
          <CardDescription>Leave empty to inherit from the published theme tokens.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Background"
            value={settings.backgroundColor}
            onChange={(v) => patch("backgroundColor", v)}
            placeholder="Inherit theme"
          />
          <TextField
            label="Primary"
            value={settings.primaryColor}
            onChange={(v) => patch("primaryColor", v)}
            placeholder="Inherit theme"
          />
          <TextField
            label="Accent"
            value={settings.accentColor}
            onChange={(v) => patch("accentColor", v)}
            placeholder="Inherit theme"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timing</CardTitle>
          <CardDescription>Control how long the preloader stays visible.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Minimum duration (ms)"
            description="Prevents a flash on fast loads."
            value={settings.minDurationMs}
            min={0}
            max={5000}
            step={50}
            onChange={(v) => patch("minDurationMs", v)}
          />
          <NumberField
            label="Maximum duration (ms)"
            description="Safety timeout if content never finishes loading."
            value={settings.maxDurationMs}
            min={1000}
            max={30000}
            step={500}
            onChange={(v) => patch("maxDurationMs", v)}
          />
          <NumberField
            label="Animation speed"
            description="1 is normal. Lower is slower, higher is faster."
            value={settings.animationSpeed}
            min={0.5}
            max={2}
            step={0.1}
            onChange={(v) => patch("animationSpeed", v)}
          />
        </CardContent>
      </Card>

      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save preloader settings"}
      </Button>
    </div>
  );
}
