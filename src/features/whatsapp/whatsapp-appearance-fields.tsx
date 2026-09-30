"use client";

import { ThemeBrandUpload } from "@/features/theme/components/theme-brand-upload";
import { ColorPickerField } from "@/components/settings";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";
import type {
  WhatsAppAppearance,
  WhatsAppButtonSize,
  WhatsAppButtonVariant,
} from "@/features/whatsapp/whatsapp.schema";
import { WhatsAppToggleField } from "@/features/whatsapp/whatsapp-settings-ui";

type Props = {
  value: WhatsAppAppearance;
  onChange: (next: WhatsAppAppearance) => void;
  showLabelToggle?: boolean;
  showFullWidth?: boolean;
  fullWidth?: boolean;
  onFullWidthChange?: (v: boolean) => void;
};

const VARIANTS: { value: WhatsAppButtonVariant; label: string }[] = [
  { value: "gold", label: "Gold" },
  { value: "outline", label: "Outline" },
  { value: "default", label: "Primary" },
  { value: "custom", label: "Custom" },
];

const SIZES: { value: WhatsAppButtonSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export function WhatsAppAppearanceFields({
  value,
  onChange,
  showLabelToggle = true,
  showFullWidth = false,
  fullWidth,
  onFullWidthChange,
}: Props) {
  const patch = (partial: Partial<WhatsAppAppearance>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      <AdminCollapsibleSection title="Visibility" defaultOpen>
        <WhatsAppToggleField
          label="Enabled"
          description="Show this WhatsApp control on the public site when a phone number is configured."
          checked={value.enabled}
          onChange={(enabled) => patch({ enabled })}
        />
        {showFullWidth && onFullWidthChange ? (
          <WhatsAppToggleField
            label="Full width button"
            description="Stretch the button to the full width of its container."
            checked={fullWidth !== false}
            onChange={onFullWidthChange}
          />
        ) : null}
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Style & size"
        description="Preset variants use theme colors. Custom lets you pick background and text colors."
        defaultOpen
      >
        <div className="space-y-2">
          <Label>Button style</Label>
          <OptionButtonGroup
            value={value.buttonVariant}
            options={VARIANTS}
            onChange={(v) => patch({ buttonVariant: v })}
            columns={2}
          />
        </div>

        {value.buttonVariant === "custom" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorPickerField
              label="Background color"
              value={value.backgroundColor}
              onChange={(backgroundColor) => patch({ backgroundColor })}
            />
            <ColorPickerField
              label="Text / icon color"
              value={value.textColor ?? "#ffffff"}
              onChange={(textColor) => patch({ textColor })}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Size</Label>
          <OptionButtonGroup
            value={value.size}
            options={SIZES}
            onChange={(v) => patch({ size: v })}
            columns={3}
          />
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Icon & label"
        description="Upload a custom PNG or SVG, or use the default WhatsApp icon."
        defaultOpen={false}
      >
        <ThemeBrandUpload
          label="Custom icon (PNG or SVG)"
          hint="Leave empty to use the default icon."
          value={value.iconUrl ?? ""}
          onChange={(url) => patch({ iconUrl: url || null })}
          previewSize={{ width: 48, height: 48 }}
        />

        <div className="space-y-2">
          <Label htmlFor="wa-icon-size">Icon size</Label>
          <Input
            id="wa-icon-size"
            value={value.iconSize ?? ""}
            onChange={(e) => patch({ iconSize: e.target.value })}
            placeholder="1.75rem"
          />
        </div>

        <WhatsAppToggleField
          label="Show icon"
          checked={value.showIcon}
          onChange={(showIcon) => patch({ showIcon })}
        />

        {showLabelToggle ? (
          <WhatsAppToggleField
            label="Show label text"
            checked={value.showLabel}
            onChange={(showLabel) => patch({ showLabel })}
          />
        ) : null}
      </AdminCollapsibleSection>
    </div>
  );
}
