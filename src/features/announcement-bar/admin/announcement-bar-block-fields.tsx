"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { SettingsSection, TextField, ToggleField } from "@/components/admin/settings-fields";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
import { LocalizedItemFields, readItemFieldValue } from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import type { AnnouncementItem } from "@/features/announcement-bar/announcement-bar.schema";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

function setNested(
  block: BlockNode,
  onChange: (b: BlockNode) => void,
  group: string,
  key: string,
  value: unknown,
) {
  const current = (block.props[group] as Record<string, unknown>) ?? {};
  setProp(block, onChange, group, { ...current, [key]: value });
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AnnouncementBarBlockFields({ block, onChange }: Props) {
  const adminEditingLocale = useAdminEditingLocaleContextOptional();
  const activeLocaleCode = adminEditingLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const items = (block.props.items as AnnouncementItem[]) ?? [];
  const visual = (block.props.visual as Record<string, unknown>) ?? {};
  const layout = (block.props.layout as Record<string, unknown>) ?? {};
  const animations = (block.props.animations as Record<string, unknown>) ?? {};
  const interactive = (block.props.interactive as Record<string, unknown>) ?? {};
  const responsive = (block.props.responsive as Record<string, unknown>) ?? {};
  const advanced = (block.props.advanced as Record<string, unknown>) ?? {};

  const updateItems = (next: AnnouncementItem[]) => setProp(block, onChange, "items", next);

  return (
    <div className="space-y-4">
      <SettingsSection title="Core">
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Variant"
            value={(block.props.variant as string) ?? "slim"}
            options={[
              { value: "slim", label: "Slim" },
              { value: "comfortable", label: "Comfortable" },
            ]}
            onChange={(v) => setProp(block, onChange, "variant", v)}
          />
          <SelectField
            label="Bar tone"
            value={(block.props.barTone as string) ?? "accent"}
            options={[
              { value: "accent", label: "Accent" },
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "muted", label: "Muted" },
              { value: "gold", label: "Gold (accent)" },
            ]}
            onChange={(v) => setProp(block, onChange, "barTone", v)}
          />
          <SelectField
            label="Scroll speed"
            value={(block.props.scrollSpeed as string) ?? "medium"}
            options={[
              { value: "slow", label: "Slow" },
              { value: "medium", label: "Medium" },
              { value: "fast", label: "Fast" },
            ]}
            onChange={(v) => setProp(block, onChange, "scrollSpeed", v)}
          />
          <SelectField
            label="Direction"
            value={(block.props.direction as string) ?? "left"}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => setProp(block, onChange, "direction", v)}
          />
        </div>
        <TextField
          label="Separator"
          value={(block.props.separator as string) ?? ""}
          onChange={(v) => setProp(block, onChange, "separator", v)}
          placeholder="◈"
        />
        <ToggleField
          label="Pause on hover"
          checked={block.props.pauseOnHover !== false}
          onChange={(v) => setProp(block, onChange, "pauseOnHover", v)}
        />
        <ToggleField
          label="Edge fade"
          checked={block.props.showEdgeFade !== false}
          onChange={(v) => setProp(block, onChange, "showEdgeFade", v)}
        />
      </SettingsSection>

      <AdminCollapsibleSection
        title="Announcements"
        description={
          items.length === 0
            ? "No items yet"
            : `${items.length} announcement${items.length !== 1 ? "s" : ""}`
        }
        defaultOpen={false}
      >
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                updateItems([
                  ...items,
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
              Add
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
              No items yet. Click Add to create one.
            </p>
          ) : null}
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              title={
                readItemFieldValue(item as unknown as Record<string, string>, "message", activeLocaleCode).trim() ||
                `Announcement ${index + 1}`
              }
              defaultOpen={false}
              onRemove={() => updateItems(items.filter((i) => i.id !== item.id))}
            >
            <LocalizedItemFields
              fields={[
                { key: "message", label: "Message" },
                { key: "badge", label: "Badge" },
              ]}
              values={item as unknown as Record<string, string>}
              onChange={(patch) =>
                updateItems(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
              }
            />
            <div>
              <Label className="text-xs">Link URL</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={item.linkUrl}
                onChange={(e) =>
                  updateItems(items.map((i) => (i.id === item.id ? { ...i, linkUrl: e.target.value } : i)))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Icon (emoji/text)</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={item.icon}
                onChange={(e) =>
                  updateItems(items.map((i) => (i.id === item.id ? { ...i, icon: e.target.value } : i)))
                }
              />
            </div>
            </ItemCard>
          ))}
        </div>
      </AdminCollapsibleSection>

      <SettingsSection title="Visual">
        <TextField label="Bar background" value={String(visual.barBackground ?? "")} onChange={(v) => setNested(block, onChange, "visual", "barBackground", v)} />
        <ToggleField label="Gradient background" checked={Boolean(visual.barBackgroundGradient)} onChange={(v) => setNested(block, onChange, "visual", "barBackgroundGradient", v)} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Gradient start" value={String(visual.gradientStart ?? "")} onChange={(v) => setNested(block, onChange, "visual", "gradientStart", v)} />
          <TextField label="Gradient end" value={String(visual.gradientEnd ?? "")} onChange={(v) => setNested(block, onChange, "visual", "gradientEnd", v)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Text color" value={String(visual.textColor ?? "")} onChange={(v) => setNested(block, onChange, "visual", "textColor", v)} />
          <TextField label="Link color" value={String(visual.linkColor ?? "")} onChange={(v) => setNested(block, onChange, "visual", "linkColor", v)} />
        </div>
        <ToggleField label="Show icons" checked={visual.showIcons !== false} onChange={(v) => setNested(block, onChange, "visual", "showIcons", v)} />
        <ToggleField label="Show badges" checked={visual.showBadges !== false} onChange={(v) => setNested(block, onChange, "visual", "showBadges", v)} />
      </SettingsSection>

      <SettingsSection title="Layout">
        <ToggleField label="Show close button" checked={layout.showCloseButton !== false} onChange={(v) => setNested(block, onChange, "layout", "showCloseButton", v)} />
        <SelectField label="Close button position" value={String(layout.closeButtonPosition ?? "right")} options={[{ value: "right", label: "Right" }, { value: "left", label: "Left" }]} onChange={(v) => setNested(block, onChange, "layout", "closeButtonPosition", v)} />
        <ToggleField label="Persistent (ignore dismiss)" checked={Boolean(layout.persistent)} onChange={(v) => setNested(block, onChange, "layout", "persistent", v)} />
        <ToggleField label="Sticky on scroll" checked={Boolean(layout.stickyOnScroll)} onChange={(v) => setNested(block, onChange, "layout", "stickyOnScroll", v)} />
        <TextField label="Container max width" value={String(layout.containerMaxWidth ?? "")} onChange={(v) => setNested(block, onChange, "layout", "containerMaxWidth", v)} />
      </SettingsSection>

      <SettingsSection title="Animation">
        <Input type="number" placeholder="Custom scroll duration (seconds)" className="h-9 text-sm" value={String(animations.scrollSpeedCustom ?? "")} onChange={(e) => setNested(block, onChange, "animations", "scrollSpeedCustom", e.target.value ? Number(e.target.value) : undefined)} />
        <div>
          <Label className="text-xs">Scroll speed (%)</Label>
          <Input
            type="number"
            min={25}
            max={400}
            className="mt-1 h-9 text-sm"
            value={String(animations.scrollSpeedPercent ?? 100)}
            onChange={(e) =>
              setNested(
                block,
                onChange,
                "animations",
                "scrollSpeedPercent",
                e.target.value ? Number(e.target.value) : 100,
              )
            }
            placeholder="100 = default; lower is slower"
          />
        </div>
        <SelectField label="Entrance" value={String(animations.entranceAnimation ?? "slide-down")} options={[{ value: "slide-down", label: "Slide down" }, { value: "fade", label: "Fade" }, { value: "none", label: "None" }]} onChange={(v) => setNested(block, onChange, "animations", "entranceAnimation", v)} />
        <ToggleField label="Hover scale on links" checked={Boolean(animations.hoverScale)} onChange={(v) => setNested(block, onChange, "animations", "hoverScale", v)} />
        <ToggleField label="Blink effect on links" checked={Boolean(animations.blinkEffect)} onChange={(v) => setNested(block, onChange, "animations", "blinkEffect", v)} />
      </SettingsSection>

      <SettingsSection title="Interactive">
        <Input type="number" placeholder="Auto-close after (seconds)" className="h-9 text-sm" value={String(interactive.closeAfterSeconds ?? "")} onChange={(e) => setNested(block, onChange, "interactive", "closeAfterSeconds", e.target.value ? Number(e.target.value) : undefined)} />
        <ToggleField label="Show progress bar" checked={Boolean(interactive.showProgress)} onChange={(v) => setNested(block, onChange, "interactive", "showProgress", v)} />
        <ToggleField label="Truncate text" checked={Boolean(interactive.truncateText)} onChange={(v) => setNested(block, onChange, "interactive", "truncateText", v)} />
      </SettingsSection>

      <SettingsSection title="Responsive">
        <ToggleField label="Hide on mobile" checked={Boolean(responsive.hideOnMobile)} onChange={(v) => setNested(block, onChange, "responsive", "hideOnMobile", v)} />
        <SelectField label="Mobile speed" value={String(responsive.mobileSpeed ?? "medium")} options={[{ value: "slow", label: "Slow" }, { value: "medium", label: "Medium" }, { value: "fast", label: "Fast" }]} onChange={(v) => setNested(block, onChange, "responsive", "mobileSpeed", v)} />
        <TextField label="Mobile font size" value={String(responsive.mobileFontSize ?? "")} onChange={(v) => setNested(block, onChange, "responsive", "mobileFontSize", v)} />
      </SettingsSection>

      <SettingsSection title="Advanced">
        <TextField label="ARIA label" value={String(advanced.ariaLabel ?? "")} onChange={(v) => setNested(block, onChange, "advanced", "ariaLabel", v)} />
        <TextField label="Container class" value={String(advanced.containerClass ?? "")} onChange={(v) => setNested(block, onChange, "advanced", "containerClass", v)} />
        <ToggleField label="Analytics events" checked={Boolean(advanced.analyticsEvents)} onChange={(v) => setNested(block, onChange, "advanced", "analyticsEvents", v)} />
        <div>
          <Label className="text-xs">Custom CSS</Label>
          <textarea
            className="mt-1 w-full min-h-[80px] rounded-md border p-2 text-xs font-mono"
            value={String(advanced.customCss ?? "")}
            onChange={(e) => setNested(block, onChange, "advanced", "customCss", e.target.value)}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
