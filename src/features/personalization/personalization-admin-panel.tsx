"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ALL_PRESETS } from "@/features/theme/presets-catalog";
import type {
  PersonalizationPosition,
  PersonalizationSettings,
} from "@/features/personalization/personalization.service";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";
import { useDesignHubSaveActions } from "@/hooks/use-design-hub-save-actions";

const POSITIONS: { value: PersonalizationPosition; label: string; hint: string }[] = [
  { value: "bottom-end", label: "Bottom end", hint: "Mirrors for RTL (inline end)" },
  { value: "bottom-start", label: "Bottom start", hint: "Mirrors for RTL (inline start)" },
  { value: "top-end", label: "Top end", hint: "Mirrors for RTL (inline end)" },
  { value: "top-start", label: "Top start", hint: "Mirrors for RTL (inline start)" },
];

const WIDGET_TABS = [
  { id: "settings", label: "Widget" },
  { id: "sections", label: "Widget sections" },
  { id: "presets", label: "Preset visibility" },
];

export function PersonalizationAdminPanel() {
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("settings");
  const savedSettingsRef = useRef<PersonalizationSettings | null>(null);

  useEffect(() => {
    fetch("/api/personalization-settings")
      .then((r) => r.json())
      .then((data: PersonalizationSettings) => {
        setSettings(data);
        savedSettingsRef.current = data;
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setStatus(null);
    const res = await fetch("/api/personalization-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    setSettings(data.settings);
    savedSettingsRef.current = data.settings;
    setStatus("Personalization settings saved.");
  }, [settings]);

  const handleCancel = useCallback(() => {
    if (savedSettingsRef.current) {
      setSettings(savedSettingsRef.current);
    }
    setStatus(null);
  }, []);

  const { markDirty } = useDesignHubSaveActions({
    onSave: handleSave,
    onCancel: handleCancel,
    saveLabel: "Save",
    enabled: Boolean(settings),
  });

  const visibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    settings?.presets.forEach((p) => map.set(p.id, p.visibleToUsers));
    return map;
  }, [settings]);

  const patchSettings = useCallback(
    (next: PersonalizationSettings) => {
      markDirty();
      setSettings(next);
    },
    [markDirty],
  );

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading widget settings…</p>;
  }

  function togglePreset(id: string, visible: boolean) {
    patchSettings({
      ...settings!,
      presets: settings!.presets.map((p) => (p.id === id ? { ...p, visibleToUsers: visible } : p)),
    });
  }

  const visibleCount = settings.presets.filter((p) => p.visibleToUsers).length;

  return (
    <div className="space-y-4">
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <AdminSettingsLayout tabs={WIDGET_TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        {(tab) =>
          tab === "settings" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Widget settings</CardTitle>
                <CardDescription>
                  Position uses logical start/end so the widget flips correctly when the site language is RTL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => patchSettings({ ...settings, enabled: e.target.checked })}
                  />
                  Show personalization widget on the public site
                </label>
                <div className="space-y-2">
                  <Label>Widget position</Label>
                  <OptionButtonGroup
                    value={settings.position}
                    options={POSITIONS.map((p) => ({ value: p.value, label: p.label }))}
                    onChange={(v) => patchSettings({ ...settings, position: v })}
                    columns={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    {POSITIONS.find((p) => p.value === settings.position)?.hint}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : tab === "sections" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Widget sections</CardTitle>
                <CardDescription>
                  Choose what visitors see in the + STYLE panel. Visual effects (background, text,
                  cursor) are configured in{" "}
                  <Link href="/admin/theme" className="text-primary underline">
                    Theme → Look &amp; Feel / Effects
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.widgetSections.showFabThemeToggle}
                    onChange={(e) =>
                      patchSettings({
                        ...settings,
                        widgetSections: {
                          ...settings.widgetSections,
                          showFabThemeToggle: e.target.checked,
                        },
                      })
                    }
                  />
                  Quick theme toggle on FAB bar (sun / moon)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.widgetSections.showAppearance}
                    onChange={(e) =>
                      patchSettings({
                        ...settings,
                        widgetSections: {
                          ...settings.widgetSections,
                          showAppearance: e.target.checked,
                        },
                      })
                    }
                  />
                  Appearance tab (light / dark / system)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.widgetSections.showStyle}
                    onChange={(e) =>
                      patchSettings({
                        ...settings,
                        widgetSections: {
                          ...settings.widgetSections,
                          showStyle: e.target.checked,
                        },
                      })
                    }
                  />
                  Style tab (industry preset grid)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.widgetSections.showBackToTop}
                    onChange={(e) =>
                      patchSettings({
                        ...settings,
                        widgetSections: {
                          ...settings.widgetSections,
                          showBackToTop: e.target.checked,
                        },
                      })
                    }
                  />
                  Back to top button on FAB bar
                </label>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">Preset visibility</CardTitle>
                  <CardDescription>Choose which industry presets visitors can pick.</CardDescription>
                </div>
                <span className="text-xs text-muted-foreground">
                  {visibleCount} of {ALL_PRESETS.length} visible
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {ALL_PRESETS.map((preset) => {
                    const visible = visibilityMap.get(preset.id) ?? false;
                    return (
                      <label
                        key={preset.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={(e) => togglePreset(preset.id, e.target.checked)}
                        />
                        <span>{preset.emoji}</span>
                        <span className="font-medium">{preset.label || preset.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      patchSettings({
                        ...settings,
                        presets: settings.presets.map((p) => ({ ...p, visibleToUsers: true })),
                      })
                    }
                  >
                    Show all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      patchSettings({
                        ...settings,
                        presets: settings.presets.map((p) => ({ ...p, visibleToUsers: false })),
                      })
                    }
                  >
                    Hide all
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }
      </AdminSettingsLayout>
    </div>
  );
}
