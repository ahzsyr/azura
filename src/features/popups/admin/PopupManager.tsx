"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PopupEditor } from "@/features/popups/admin/PopupEditor";
import type { PopupEditorSectionId } from "@/features/popups/admin/PopupEditorNav";
import { PopupLibrary } from "@/features/popups/admin/PopupLibrary";
import {
  patchPopupItemWithTimestamp,
  type PopupItemPatch,
} from "@/features/popups/admin/lib/patch-popup-item";
import { createDefaultPopupItem } from "@/features/popups/popup.schema";
import type { SitePopupsSettings } from "@/features/popups/site-popups.schema";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { useDesignHubSettingsActions } from "@/hooks/use-design-hub-settings-actions";
import "@/features/popups/admin/popup-admin.css";

type Props = {
  initialSettings: SitePopupsSettings;
};

type ViewState =
  | { mode: "library" }
  | { mode: "editor"; itemId: string; section: PopupEditorSectionId };

export function PopupManager({ initialSettings }: Props) {
  const [settings, setSettings] = useState<SitePopupsSettings>(initialSettings);
  const [view, setView] = useState<ViewState>({ mode: "library" });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedSettingsRef = useRef(initialSettings);

  const editingItem = useMemo(() => {
    if (view.mode !== "editor") return null;
    return settings.items.find((item) => item.id === view.itemId) ?? null;
  }, [settings.items, view]);

  const handleSave = useCallback(async () => {
    setStatus(null);
    setError(null);
    const res = await fetch("/api/save-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "sitePopups",
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
    setStatus("Popup settings saved.");
  }, [settings]);

  const handleCancel = useCallback(() => {
    setSettings(savedSettingsRef.current);
    setView({ mode: "library" });
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

  const updateSettings = (updater: (prev: SitePopupsSettings) => SitePopupsSettings) => {
    markDirty();
    setSettings(updater);
  };

  const patchItem = (id: string, patch: PopupItemPatch) => {
    updateSettings((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? patchPopupItemWithTimestamp(item, patch) : item,
      ),
    }));
  };

  const createItem = () => {
    const item = createDefaultPopupItem();
    updateSettings((prev) => ({ ...prev, items: [...prev.items, item] }));
    setView({ mode: "editor", itemId: item.id, section: "behavior" });
  };

  const duplicateItem = (id: string) => {
    const source = settings.items.find((item) => item.id === id);
    if (!source) return;
    const newId = crypto.randomUUID();
    const clone = createDefaultPopupItem({
      ...source,
      id: newId,
      name: `${source.name} (copy)`,
      dismissKey: `popup-${newId.slice(0, 8)}`,
      frequency: {
        ...source.frequency,
        storageKey: `popup-${newId.slice(0, 8)}`,
      },
      content: {
        ...source.content,
        primaryCta: { ...source.content.primaryCta },
        secondaryCta: { ...source.content.secondaryCta },
        blocks: source.content.blocks.map((block) => ({ ...block })),
      },
      design: { ...source.design },
      updatedAt: new Date().toISOString(),
    });
    updateSettings((prev) => ({ ...prev, items: [...prev.items, clone] }));
  };

  const deleteItem = (id: string) => {
    updateSettings((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    if (view.mode === "editor" && view.itemId === id) {
      setView({ mode: "library" });
    }
  };

  return (
    <div className="popup-admin">
      {status ? <p className="mb-3 text-sm text-emerald-600">{status}</p> : null}
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      {view.mode === "library" || !editingItem ? (
        <PopupLibrary
          settings={settings}
          onSystemEnabledChange={(enabled) =>
            updateSettings((prev) => ({ ...prev, enabled }))
          }
          onReorder={(items) => updateSettings((prev) => ({ ...prev, items }))}
          onEdit={(itemId) => setView({ mode: "editor", itemId, section: "content" })}
          onToggle={(id, enabled) => patchItem(id, { enabled })}
          onDuplicate={duplicateItem}
          onDelete={deleteItem}
          onCreate={createItem}
        />
      ) : (
        <PopupEditor
          item={editingItem}
          allItems={settings.items}
          section={view.section}
          onSectionChange={(section) =>
            setView({ mode: "editor", itemId: editingItem.id, section })
          }
          onBack={() => setView({ mode: "library" })}
          onPatch={(patch) => patchItem(editingItem.id, patch)}
        />
      )}
    </div>
  );
}
