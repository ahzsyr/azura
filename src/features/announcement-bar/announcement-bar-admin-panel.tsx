"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSection, TextField, ToggleField } from "@/components/admin/settings-fields";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { ItemCard } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
import { AnnouncementBarView } from "@/features/announcement-bar/announcement-bar-view";
import type { AnnouncementItem } from "@/features/announcement-bar/announcement-bar.schema";
import type { SiteAnnouncementBarSettings } from "@/features/announcement-bar/site-announcement-bar.schema";
import { LocalizedItemFields, readItemFieldValue } from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { useDesignHubSettingsActions } from "@/hooks/use-design-hub-settings-actions";

type Props = {
  initialSettings: SiteAnnouncementBarSettings;
};

export function AnnouncementBarAdminPanel({ initialSettings }: Props) {
  const adminEditingLocale = useAdminEditingLocaleContextOptional();
  const previewLocale = adminEditingLocale?.activeLocaleCode ?? adminLocale.code;
  const previewEnabledLocales = adminEditingLocale?.locales;
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

  const { markDirty } = useDesignHubSettingsActions({
    onSave: handleSave,
    onCancel: handleCancel,
    saveLabel: "Save",
    publishEntityType: "site-settings",
    loadPublishStatus: true,
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
            locale={previewLocale}
            enabledLocales={previewEnabledLocales}
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
      </SettingsSection>

      <SettingsSection title="Announcement items">
        <p className="text-xs text-muted-foreground">
          Use the admin language switcher to edit message text per locale. Empty non-English fields fall
          back to English on the public site.
        </p>
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                patch("items", [
                  ...settings.items,
                  {
                    id: newId("ab"),
                    message: "",
                    title: "",
                    description: "",
                    linkUrl: "",
                    icon: "",
                    badge: "",
                  },
                ])
              }
            >
              Add item
            </Button>
          </div>
          {settings.items.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
              No items yet. Add announcements or they will show the default English placeholder on the site.
            </p>
          ) : null}
          {settings.items.map((item, index) => (
            <ItemCard
              key={item.id}
              title={
                readItemFieldValue(item as unknown as Record<string, string>, "message", previewLocale).trim() ||
                `Announcement ${index + 1}`
              }
              defaultOpen={index === 0}
              onRemove={() => patch("items", settings.items.filter((i) => i.id !== item.id))}
            >
              <LocalizedItemFields
                fields={[{ key: "message", label: "Message" }]}
                values={item as unknown as Record<string, string>}
                onChange={(fieldPatch) =>
                  patch(
                    "items",
                    settings.items.map((i) =>
                      i.id === item.id ? ({ ...i, ...fieldPatch } as AnnouncementItem) : i
                    )
                  )
                }
              />
              <div>
                <Label className="text-xs">Link URL</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  value={item.linkUrl}
                  onChange={(e) =>
                    patch(
                      "items",
                      settings.items.map((i) =>
                        i.id === item.id ? { ...i, linkUrl: e.target.value } : i
                      )
                    )
                  }
                />
              </div>
            </ItemCard>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
