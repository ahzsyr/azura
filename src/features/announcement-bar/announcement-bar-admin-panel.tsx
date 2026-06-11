"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SettingsSection, TextField, ToggleField } from "@/components/admin/settings-fields";
import { AnnouncementBarView } from "@/features/announcement-bar/announcement-bar-view";
import type { SiteAnnouncementBarSettings } from "@/features/announcement-bar/site-announcement-bar.schema";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { useDesignHubSaveActions } from "@/hooks/use-design-hub-save-actions";

type Props = {
  initialSettings: SiteAnnouncementBarSettings;
  locale: string;
};

export function AnnouncementBarAdminPanel({ initialSettings, locale }: Props) {
  const [settings, setSettings] = useState<SiteAnnouncementBarSettings>(initialSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedSettingsRef = useRef(initialSettings);

  const handleSave = useCallback(async () => {
    setStatus(null);
    setError(null);
    const res = await fetch("/api/save-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "siteAnnouncementBar",
        value: settings,
        locale: adminLocale.code,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      const message = data.error ?? "Save failed";
      setError(message);
      throw new Error(message);
    }
    savedSettingsRef.current = settings;
    setStatus("Announcement bar settings saved.");
  }, [settings]);

  const handleCancel = useCallback(() => {
    setSettings(savedSettingsRef.current);
    setStatus(null);
    setError(null);
  }, []);

  const { markDirty } = useDesignHubSaveActions({
    onSave: handleSave,
    onCancel: handleCancel,
    saveLabel: "Save",
  });

  const previewProps = useMemo(() => {
    const { enabled: _enabled, suppressOnPagesWithBlock: _suppress, dismissKey, ...bar } = settings;
    return bar;
  }, [settings]);

  const patch = <K extends keyof SiteAnnouncementBarSettings>(key: K, value: SiteAnnouncementBarSettings[K]) => {
    markDirty();
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card className="admin-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live preview</CardTitle>
          <CardDescription>Preview uses current form values (global enabled state not required).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AnnouncementBarView
            {...previewProps}
            locale={locale}
            barId="announcement-bar-admin-preview"
            dismissStorageKey="announcement-bar-admin-preview_closed"
          />
        </CardContent>
      </Card>

      <SettingsSection title="Global">
        <ToggleField
          label="Enable site-wide bar"
          checked={settings.enabled}
          onChange={(v) => patch("enabled", v)}
        />
        <ToggleField
          label="Suppress when page has announcementBar block"
          checked={settings.suppressOnPagesWithBlock}
          onChange={(v) => patch("suppressOnPagesWithBlock", v)}
        />
        <TextField
          label="Dismiss storage key"
          value={settings.dismissKey}
          onChange={(v) => patch("dismissKey", v)}
        />
      </SettingsSection>

      <SettingsSection title="Content">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Variant</Label>
            <select
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value={settings.variant}
              onChange={(e) => patch("variant", e.target.value as SiteAnnouncementBarSettings["variant"])}
            >
              <option value="slim">Slim</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Bar tone</Label>
            <select
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value={settings.barTone}
              onChange={(e) => patch("barTone", e.target.value as SiteAnnouncementBarSettings["barTone"])}
            >
              <option value="accent">Accent</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="muted">Muted</option>
              <option value="gold">Gold</option>
            </select>
          </div>
        </div>
        <TextField
          label="Separator"
          value={settings.separator}
          onChange={(v) => patch("separator", v)}
        />
        <p className="text-xs text-muted-foreground">
          {settings.items.length} announcement item(s). Edit items on individual CMS pages or sync defaults here via page blocks.
        </p>
      </SettingsSection>
    </div>
  );
}
