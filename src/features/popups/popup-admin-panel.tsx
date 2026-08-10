"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  NumberField,
  SettingsSection,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/settings-fields";
import { GlobalPopupHost } from "@/features/popups/components/global-popup-host";
import { createDefaultPopupItem, type PopupItem } from "@/features/popups/popup.schema";
import type { SitePopupsSettings } from "@/features/popups/site-popups.schema";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { useDesignHubSettingsActions } from "@/hooks/use-design-hub-settings-actions";
import { cn } from "@/lib/utils";

type Props = {
  initialSettings: SitePopupsSettings;
};

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        className="h-9 w-full rounded-md border px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SortablePopupRow({
  item,
  selected,
  onSelect,
  onToggle,
  onRemove,
}: {
  item: PopupItem;
  selected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2",
        selected && "border-primary/50 ring-1 ring-primary/20",
        isDragging && "opacity-60",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none shrink-0 p-1"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <span className="block truncate text-sm font-medium">{item.name}</span>
        <span className="block truncate text-xs text-muted-foreground capitalize">{item.type}</span>
      </button>
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={item.enabled} onChange={(e) => onToggle(e.target.checked)} />
        Show
      </label>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove popup">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PopupItemEditor({
  item,
  allItems,
  onChange,
}: {
  item: PopupItem;
  allItems: PopupItem[];
  onChange: (next: PopupItem) => void;
}) {
  const patch = <K extends keyof PopupItem>(key: K, value: PopupItem[K]) => {
    onChange({ ...item, [key]: value });
  };

  const patchContent = (key: keyof PopupItem["content"], value: string) => {
    onChange({ ...item, content: { ...item.content, [key]: value } });
  };

  const patchDesign = (key: keyof PopupItem["design"], value: string | number) => {
    onChange({ ...item, design: { ...item.design, [key]: value } });
  };

  const patchTrigger = (key: keyof PopupItem["trigger"], value: string | number) => {
    onChange({ ...item, trigger: { ...item.trigger, [key]: value } });
  };

  const patchFrequency = (key: keyof PopupItem["frequency"], value: string | number) => {
    onChange({ ...item, frequency: { ...item.frequency, [key]: value } });
  };

  const patchDevices = (key: keyof PopupItem["devices"], value: boolean) => {
    onChange({ ...item, devices: { ...item.devices, [key]: value } });
  };

  const patchPageTargeting = (key: keyof PopupItem["pageTargeting"], value: string | string[]) => {
    onChange({ ...item, pageTargeting: { ...item.pageTargeting, [key]: value } });
  };

  const patchSchedule = (key: keyof PopupItem["schedule"], value: string | boolean) => {
    onChange({ ...item, schedule: { ...item.schedule, [key]: value } });
  };

  const patchOffset = (key: keyof PopupItem["customOffset"], value: number) => {
    onChange({ ...item, customOffset: { ...item.customOffset, [key]: value } });
  };

  const patchPrimaryCta = (key: keyof PopupItem["content"]["primaryCta"], value: string | boolean) => {
    onChange({
      ...item,
      content: {
        ...item.content,
        primaryCta: { ...item.content.primaryCta, [key]: value },
      },
    });
  };

  const patchSecondaryCta = (key: keyof PopupItem["content"]["secondaryCta"], value: string | boolean) => {
    onChange({
      ...item,
      content: {
        ...item.content,
        secondaryCta: { ...item.content.secondaryCta, [key]: value },
      },
    });
  };

  const linkedOptions = allItems.filter((entry) => entry.id !== item.id && entry.type !== "floatingButton");

  return (
    <div className="space-y-6">
      <SettingsSection title="General">
        <TextField label="Name" value={item.name} onChange={(v) => patch("name", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={item.type}
            onChange={(v) => patch("type", v as PopupItem["type"])}
            options={[
              { value: "floatingButton", label: "Floating button" },
              { value: "modal", label: "Modal popup" },
              { value: "slideIn", label: "Slide-in panel" },
              { value: "promo", label: "Promo / announcement" },
            ]}
          />
          <SelectField
            label="Position"
            value={item.position}
            onChange={(v) => patch("position", v as PopupItem["position"])}
            options={[
              { value: "bottom-end", label: "Bottom end" },
              { value: "bottom-start", label: "Bottom start" },
              { value: "top-end", label: "Top end" },
              { value: "top-start", label: "Top start" },
              { value: "center", label: "Center" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
              { value: "custom", label: "Custom offsets" },
            ]}
          />
        </div>
        <ToggleField label="Enabled" checked={item.enabled} onChange={(v) => patch("enabled", v)} />
        <ToggleField label="Dismissible" checked={item.dismissible} onChange={(v) => patch("dismissible", v)} />
        <TextField label="Dismiss key" value={item.dismissKey} onChange={(v) => patch("dismissKey", v)} />
        {item.type === "floatingButton" ? (
          <SelectField
            label="Linked popup (optional)"
            value={item.linkedPopupId}
            onChange={(v) => patch("linkedPopupId", v)}
            options={[
              { value: "", label: "None — use CTA link" },
              ...linkedOptions.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection title="Content">
        <TextField label="Title" value={item.content.title} onChange={(v) => patchContent("title", v)} />
        <TextField label="Subtitle" value={item.content.subtitle} onChange={(v) => patchContent("subtitle", v)} />
        <TextAreaField label="Body text" value={item.content.body} onChange={(v) => patchContent("body", v)} rows={3} />
        <TextAreaField
          label="Safe HTML body"
          description="Basic HTML tags only. Scripts and inline handlers are stripped."
          value={item.content.bodyHtml}
          onChange={(v) => patchContent("bodyHtml", v)}
          rows={4}
        />
        <TextField label="Image URL" value={item.content.imageUrl} onChange={(v) => patchContent("imageUrl", v)} />
        <TextField label="Video embed URL" value={item.content.videoUrl} onChange={(v) => patchContent("videoUrl", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Primary CTA label"
            value={item.content.primaryCta.label}
            onChange={(v) => patchPrimaryCta("label", v)}
          />
          <TextField
            label="Primary CTA href"
            value={item.content.primaryCta.href}
            onChange={(v) => patchPrimaryCta("href", v)}
          />
          <TextField
            label="Secondary CTA label"
            value={item.content.secondaryCta.label}
            onChange={(v) => patchSecondaryCta("label", v)}
          />
          <TextField
            label="Secondary CTA href"
            value={item.content.secondaryCta.href}
            onChange={(v) => patchSecondaryCta("href", v)}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Design & styling">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Background color" value={item.design.backgroundColor} onChange={(v) => patchDesign("backgroundColor", v)} />
          <TextField label="Text color" value={item.design.textColor} onChange={(v) => patchDesign("textColor", v)} />
          <TextField label="Accent color" value={item.design.accentColor} onChange={(v) => patchDesign("accentColor", v)} />
          <TextField label="Border color" value={item.design.borderColor} onChange={(v) => patchDesign("borderColor", v)} />
          <TextField label="Box shadow" value={item.design.boxShadow} onChange={(v) => patchDesign("boxShadow", v)} />
          <TextField label="Icon name (Lucide)" value={item.design.icon} onChange={(v) => patchDesign("icon", v)} />
          <TextField label="Icon URL" value={item.design.iconUrl} onChange={(v) => patchDesign("iconUrl", v)} />
          <TextField label="Font family" value={item.design.fontFamily} onChange={(v) => patchDesign("fontFamily", v)} />
          <NumberField label="Font size (px)" value={item.design.fontSize} onChange={(v) => patchDesign("fontSize", v)} min={10} max={32} />
          <NumberField label="Font weight" value={item.design.fontWeight} onChange={(v) => patchDesign("fontWeight", v)} min={300} max={900} step={100} />
          <NumberField label="Border radius (px)" value={item.design.borderRadius} onChange={(v) => patchDesign("borderRadius", v)} min={0} max={48} />
          <NumberField label="Border width (px)" value={item.design.borderWidth} onChange={(v) => patchDesign("borderWidth", v)} min={0} max={8} />
          <NumberField label="Padding (px)" value={item.design.padding} onChange={(v) => patchDesign("padding", v)} min={0} max={64} />
          <NumberField label="Max width (px)" value={item.design.maxWidth} onChange={(v) => patchDesign("maxWidth", v)} min={200} max={900} />
          <NumberField label="Animation duration (ms)" value={item.design.animationDurationMs} onChange={(v) => patchDesign("animationDurationMs", v)} min={0} max={2000} step={20} />
        </div>
        <SelectField
          label="Animation"
          value={item.design.animation}
          onChange={(v) => patchDesign("animation", v)}
          options={[
            { value: "none", label: "None" },
            { value: "fade", label: "Fade" },
            { value: "slide", label: "Slide" },
            { value: "scale", label: "Scale" },
            { value: "bounce", label: "Bounce" },
          ]}
        />
      </SettingsSection>

      <SettingsSection title="Placement offsets">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Top (px)" value={item.customOffset.top} onChange={(v) => patchOffset("top", v)} min={0} max={500} />
          <NumberField label="Right (px)" value={item.customOffset.right} onChange={(v) => patchOffset("right", v)} min={0} max={500} />
          <NumberField label="Bottom (px)" value={item.customOffset.bottom} onChange={(v) => patchOffset("bottom", v)} min={0} max={500} />
          <NumberField label="Left (px)" value={item.customOffset.left} onChange={(v) => patchOffset("left", v)} min={0} max={500} />
        </div>
        <NumberField label="Z-index" value={item.zIndex} onChange={(v) => patch("zIndex", v)} min={1000} max={99999} />
      </SettingsSection>

      <SettingsSection title="Targeting">
        <div className="grid gap-2 sm:grid-cols-3">
          <ToggleField label="Desktop" checked={item.devices.desktop} onChange={(v) => patchDevices("desktop", v)} />
          <ToggleField label="Tablet" checked={item.devices.tablet} onChange={(v) => patchDevices("tablet", v)} />
          <ToggleField label="Mobile" checked={item.devices.mobile} onChange={(v) => patchDevices("mobile", v)} />
        </div>
        <SelectField
          label="Page targeting mode"
          value={item.pageTargeting.mode}
          onChange={(v) => patchPageTargeting("mode", v)}
          options={[
            { value: "all", label: "All pages" },
            { value: "include", label: "Include paths only" },
            { value: "exclude", label: "Exclude paths" },
          ]}
        />
        <TextAreaField
          label="Path patterns (one per line)"
          description="Examples: /products, /blog/*"
          value={item.pageTargeting.paths.join("\n")}
          onChange={(v) => patchPageTargeting("paths", v.split("\n").map((line) => line.trim()).filter(Boolean))}
          rows={4}
        />
      </SettingsSection>

      <SettingsSection title="Triggers & frequency">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Trigger"
            value={item.trigger.type}
            onChange={(v) => patchTrigger("type", v)}
            options={[
              { value: "pageLoad", label: "On page load" },
              { value: "scrollPercent", label: "Scroll percentage" },
              { value: "exitIntent", label: "Exit intent" },
              { value: "delayMs", label: "Time delay (ms)" },
              { value: "click", label: "Click selector" },
            ]}
          />
          {(item.trigger.type === "scrollPercent" || item.trigger.type === "delayMs") && (
            <NumberField
              label={item.trigger.type === "scrollPercent" ? "Scroll %" : "Delay (ms)"}
              value={item.trigger.value}
              onChange={(v) => patchTrigger("value", v)}
              min={0}
              max={item.trigger.type === "scrollPercent" ? 100 : 60000}
            />
          )}
          {item.trigger.type === "click" && (
            <TextField
              label="Click selector"
              value={item.trigger.clickSelector}
              onChange={(v) => patchTrigger("clickSelector", v)}
            />
          )}
        </div>
        <SelectField
          label="Display frequency"
          value={item.frequency.mode}
          onChange={(v) => patchFrequency("mode", v)}
          options={[
            { value: "always", label: "Always" },
            { value: "once", label: "Once ever" },
            { value: "session", label: "Once per session" },
            { value: "daily", label: "Daily limit" },
            { value: "custom", label: "Custom cooldown" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Max impressions"
            value={item.frequency.maxImpressions}
            onChange={(v) => patchFrequency("maxImpressions", v)}
            min={1}
            max={100}
          />
          <NumberField
            label="Cooldown (hours)"
            value={item.frequency.cooldownHours}
            onChange={(v) => patchFrequency("cooldownHours", v)}
            min={0}
            max={720}
          />
          <TextField
            label="Frequency storage key"
            value={item.frequency.storageKey}
            onChange={(v) => patchFrequency("storageKey", v)}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Scheduling">
        <ToggleField
          label="Enable schedule window"
          checked={item.schedule.enabled}
          onChange={(v) => patchSchedule("enabled", v)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Start (ISO datetime)"
            value={item.schedule.startAt}
            onChange={(v) => patchSchedule("startAt", v)}
          />
          <TextField
            label="End (ISO datetime)"
            value={item.schedule.endAt}
            onChange={(v) => patchSchedule("endAt", v)}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

export function PopupAdminPanel({ initialSettings }: Props) {
  const [settings, setSettings] = useState<SitePopupsSettings>(initialSettings);
  const [selectedId, setSelectedId] = useState<string | null>(settings.items[0]?.id ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedSettingsRef = useRef(initialSettings);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedItem = useMemo(
    () => settings.items.find((item) => item.id === selectedId) ?? null,
    [settings.items, selectedId],
  );

  const previewSettings = useMemo(
    () => ({
      ...settings,
      enabled: true,
      activeItems: selectedItem ? [selectedItem] : settings.items.filter((item) => item.enabled),
    }),
    [settings, selectedItem],
  );

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
    setSelectedId(savedSettingsRef.current.items[0]?.id ?? null);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateSettings((prev) => {
      const oldIndex = prev.items.findIndex((item) => item.id === active.id);
      const newIndex = prev.items.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
    });
  };

  const addItem = () => {
    const item = createDefaultPopupItem();
    updateSettings((prev) => ({ ...prev, items: [...prev.items, item] }));
    setSelectedId(item.id);
  };

  const removeItem = (id: string) => {
    updateSettings((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    if (selectedId === id) {
      setSelectedId((current) => {
        const remaining = settings.items.filter((item) => item.id !== id);
        return remaining[0]?.id ?? null;
      });
    }
  };

  return (
    <div className="space-y-6">
      {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <SettingsSection title="Global">
        <ToggleField
          label="Enable popup management system"
          checked={settings.enabled}
          onChange={(v) => updateSettings((prev) => ({ ...prev, enabled: v }))}
        />
      </SettingsSection>

      <Card className="admin-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live preview</CardTitle>
          <CardDescription>
            Preview uses the selected item (or all enabled items if none selected).
          </CardDescription>
        </CardHeader>
        <CardContent className="relative min-h-[220px] overflow-hidden rounded-lg border bg-muted/20 p-4">
          <GlobalPopupHost
            settings={previewSettings}
            previewItemId={selectedItem?.id}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="admin-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Popups & buttons</CardTitle>
              <CardDescription>Drag to reorder. Toggle visibility per item.</CardDescription>
            </div>
            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {settings.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No popup items yet. Add one to get started.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={settings.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {settings.items.map((item) => (
                    <SortablePopupRow
                      key={item.id}
                      item={item}
                      selected={item.id === selectedId}
                      onSelect={() => setSelectedId(item.id)}
                      onToggle={(enabled) =>
                        updateSettings((prev) => ({
                          ...prev,
                          items: prev.items.map((entry) =>
                            entry.id === item.id ? { ...entry, enabled } : entry,
                          ),
                        }))
                      }
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedItem ? selectedItem.name : "Select a popup item"}
            </CardTitle>
            <CardDescription>Configure content, design, targeting, triggers, and scheduling.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedItem ? (
              <PopupItemEditor
                item={selectedItem}
                allItems={settings.items}
                onChange={(next) =>
                  updateSettings((prev) => ({
                    ...prev,
                    items: prev.items.map((entry) => (entry.id === next.id ? next : entry)),
                  }))
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select or create a popup item to edit its settings.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
