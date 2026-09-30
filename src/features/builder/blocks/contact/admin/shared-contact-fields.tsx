"use client";

import type { ReactNode } from "react";
import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocalizedBlockTitle, LocalizedBlockTextarea } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";

type SetProp = (key: string, value: unknown) => void;

type BlockFieldsProps = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function makeContactSetProp(
  block: BlockNode,
  onChange: (block: BlockNode) => void,
): SetProp {
  return (key, value) => onChange(patchBlockSettings(block, { [key]: value }));
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
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

/** Shared appearance panel — optional fields inherit from ContactTheme when empty. */
export function ContactCardBaseFields({
  block,
  setProp,
}: {
  block: BlockNode;
  setProp: SetProp;
}) {
  const p = block.props;
  return (
    <div className="space-y-3">
      <IconNameSelect
        value={(p.icon as string) ?? ""}
        onChange={(v) => setProp("icon", v)}
      />
      <SelectField
        label="Icon position (empty = inherit)"
        value={(p.iconPosition as string) ?? ""}
        onChange={(v) => setProp("iconPosition", v || undefined)}
        options={[
          { value: "", label: "Inherit" },
          { value: "left", label: "Left" },
          { value: "top", label: "Top" },
          { value: "right", label: "Right" },
        ]}
      />
      <SelectField
        label="Icon style"
        value={(p.iconStyle as string) ?? ""}
        onChange={(v) => setProp("iconStyle", v || undefined)}
        options={[
          { value: "", label: "Inherit" },
          { value: "plain", label: "Plain" },
          { value: "circle", label: "Circle" },
          { value: "rounded", label: "Rounded" },
          { value: "square", label: "Square" },
        ]}
      />
      <SelectField
        label="Card style"
        value={(p.cardStyle as string) ?? ""}
        onChange={(v) => setProp("cardStyle", v || undefined)}
        options={[
          { value: "", label: "Default" },
          { value: "card", label: "Card" },
          { value: "flat", label: "Flat" },
          { value: "bordered", label: "Bordered" },
          { value: "filled", label: "Filled" },
        ]}
      />
      <SelectField
        label="Border radius"
        value={(p.borderRadius as string) ?? ""}
        onChange={(v) => setProp("borderRadius", v || undefined)}
        options={[
          { value: "", label: "Inherit" },
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "XL" },
          { value: "full", label: "Pill" },
        ]}
      />
      <SelectField
        label="Shadow"
        value={(p.shadow as string) ?? ""}
        onChange={(v) => setProp("shadow", v || undefined)}
        options={[
          { value: "", label: "Inherit" },
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]}
      />
      <SelectField
        label="Padding"
        value={(p.padding as string) ?? ""}
        onChange={(v) => setProp("padding", v || undefined)}
        options={[
          { value: "", label: "Default" },
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "XL" },
        ]}
      />
      <SelectField
        label="Spacing"
        value={(p.spacing as string) ?? ""}
        onChange={(v) => setProp("spacing", v || undefined)}
        options={[
          { value: "", label: "Inherit" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]}
      />
      <SelectField
        label="Alignment"
        value={(p.alignment as string) ?? ""}
        onChange={(v) => setProp("alignment", v || undefined)}
        options={[
          { value: "", label: "Default" },
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]}
      />
    </div>
  );
}

export function ContactThemeFields({
  theme,
  onChange,
}: {
  theme: ContactTheme;
  onChange: (theme: ContactTheme) => void;
}) {
  const set = (key: keyof ContactTheme, value: string) =>
    onChange({ ...theme, [key]: value || undefined });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Theme defaults apply to all child contact cards unless overridden.
      </p>
      <SelectField
        label="Card radius"
        value={theme.cardRadius ?? ""}
        onChange={(v) => set("cardRadius", v)}
        options={[
          { value: "", label: "Default" },
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "XL" },
        ]}
      />
      <SelectField
        label="Card shadow"
        value={theme.cardShadow ?? ""}
        onChange={(v) => set("cardShadow", v)}
        options={[
          { value: "", label: "Default" },
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]}
      />
      <SelectField
        label="Icon style"
        value={theme.iconStyle ?? ""}
        onChange={(v) => set("iconStyle", v)}
        options={[
          { value: "", label: "Default" },
          { value: "plain", label: "Plain" },
          { value: "circle", label: "Circle" },
          { value: "rounded", label: "Rounded" },
          { value: "square", label: "Square" },
        ]}
      />
      <SelectField
        label="Spacing"
        value={theme.spacing ?? ""}
        onChange={(v) => set("spacing", v)}
        options={[
          { value: "", label: "Default" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]}
      />
    </div>
  );
}

type ContactAdminTabsProps = BlockFieldsProps & {
  content: ReactNode;
  items?: ReactNode;
  showItems?: boolean;
};

/** Standardized tab layout: General | Content | Items | Appearance | Advanced */
export function ContactAdminTabs({
  block,
  onChange,
  content,
  items,
  showItems = false,
}: ContactAdminTabsProps) {
  const setProp = makeContactSetProp(block, onChange);

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className={cnTabs(showItems)}>
        <TabsTrigger value="general" className="text-xs px-1">
          General
        </TabsTrigger>
        <TabsTrigger value="content" className="text-xs px-1">
          Content
        </TabsTrigger>
        {showItems ? (
          <TabsTrigger value="items" className="text-xs px-1">
            Items
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="appearance" className="text-xs px-1">
          Appearance
        </TabsTrigger>
        <TabsTrigger value="advanced" className="text-xs px-1">
          Advanced
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-3 mt-3">
        <LocalizedBlockTitle block={block} />
        <LocalizedBlockTextarea block={block} field="description" label="Description" rows={2} />
      </TabsContent>

      <TabsContent value="content" className="space-y-3 mt-3">
        {content}
      </TabsContent>

      {showItems ? (
        <TabsContent value="items" className="space-y-3 mt-3">
          {items}
        </TabsContent>
      ) : null}

      <TabsContent value="appearance" className="space-y-3 mt-3">
        <ContactCardBaseFields block={block} setProp={setProp} />
      </TabsContent>

      <TabsContent value="advanced" className="space-y-3 mt-3">
        <SelectField
          label="Animation"
          value={(block.props.animation as string) ?? ""}
          onChange={(v) => setProp("animation", v || undefined)}
          options={[
            { value: "", label: "None" },
            { value: "fadeIn", label: "Fade in" },
            { value: "slideUp", label: "Slide up" },
          ]}
        />
        <div>
          <Label className="text-xs">Custom CSS class</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={(block.props.cssClass as string) ?? ""}
            onChange={(e) => setProp("cssClass", e.target.value)}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function cnTabs(showItems: boolean) {
  return showItems
    ? "grid w-full grid-cols-5 h-auto"
    : "grid w-full grid-cols-4 h-auto";
}

export { SelectField };
