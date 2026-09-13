"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import type { DynamicFormAppearance } from "./dynamic-form-appearance";

type Props = {
  values: Partial<DynamicFormAppearance>;
  onChange: (patch: Partial<DynamicFormAppearance>) => void;
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

const RADIUS_OPTS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "XL" },
  { value: "full", label: "Pill" },
];

const SIZE_OPTS = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export function DynamicFormAppearanceFields({ values, onChange }: Props) {
  const set = <K extends keyof DynamicFormAppearance>(key: K, value: DynamicFormAppearance[K]) =>
    onChange({ [key]: value });

  return (
    <Tabs defaultValue="header" className="w-full">
      <TabsList className="grid w-full grid-cols-5 h-auto">
        <TabsTrigger value="header" className="text-xs px-1">
          Header
        </TabsTrigger>
        <TabsTrigger value="fields" className="text-xs px-1">
          Fields
        </TabsTrigger>
        <TabsTrigger value="button" className="text-xs px-1">
          Button
        </TabsTrigger>
        <TabsTrigger value="container" className="text-xs px-1">
          Container
        </TabsTrigger>
        <TabsTrigger value="layout" className="text-xs px-1">
          Layout
        </TabsTrigger>
      </TabsList>

      <TabsContent value="header" className="space-y-3 mt-3">
        <IconNameSelect
          value={values.formIcon ?? ""}
          onChange={(v) => set("formIcon", v)}
          label="Form icon"
        />
        <SelectField
          label="Icon position"
          value={values.iconPosition ?? "left"}
          onChange={(v) => set("iconPosition", v as "left" | "top")}
          options={[
            { value: "left", label: "Left" },
            { value: "top", label: "Top" },
          ]}
        />
        <div>
          <Label className="text-xs">Subtitle</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.subtitle ?? ""}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Badge</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.badge ?? ""}
            onChange={(e) => set("badge", e.target.value)}
          />
        </div>
      </TabsContent>

      <TabsContent value="fields" className="space-y-3 mt-3">
        <SelectField
          label="Field radius"
          value={values.fieldRadius ?? "md"}
          onChange={(v) => set("fieldRadius", v as DynamicFormAppearance["fieldRadius"])}
          options={RADIUS_OPTS}
        />
        <SelectField
          label="Field height"
          value={values.fieldHeight ?? "md"}
          onChange={(v) => set("fieldHeight", v as DynamicFormAppearance["fieldHeight"])}
          options={SIZE_OPTS}
        />
        <SelectField
          label="Field padding"
          value={values.fieldPadding ?? "md"}
          onChange={(v) => set("fieldPadding", v as DynamicFormAppearance["fieldPadding"])}
          options={SIZE_OPTS}
        />
        <SelectField
          label="Border width"
          value={values.borderWidth ?? "1"}
          onChange={(v) => set("borderWidth", v as DynamicFormAppearance["borderWidth"])}
          options={[
            { value: "1", label: "1px" },
            { value: "2", label: "2px" },
            { value: "3", label: "3px" },
          ]}
        />
        <div>
          <Label className="text-xs">Focus color</Label>
          <Input
            className="mt-1 h-8 text-sm"
            placeholder="#3b82f6"
            value={values.focusColor ?? ""}
            onChange={(e) => set("focusColor", e.target.value)}
          />
        </div>
        <SelectField
          label="Label position"
          value={values.labelPosition ?? "top"}
          onChange={(v) => set("labelPosition", v as DynamicFormAppearance["labelPosition"])}
          options={[
            { value: "top", label: "Top" },
            { value: "floating", label: "Floating" },
            { value: "hidden", label: "Hidden" },
          ]}
        />
        <SelectField
          label="Input size"
          value={values.inputSize ?? "md"}
          onChange={(v) => set("inputSize", v as DynamicFormAppearance["inputSize"])}
          options={SIZE_OPTS}
        />
      </TabsContent>

      <TabsContent value="button" className="space-y-3 mt-3">
        <div>
          <Label className="text-xs">Button text</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.buttonText ?? ""}
            onChange={(e) => set("buttonText", e.target.value)}
          />
        </div>
        <IconNameSelect
          value={values.buttonIcon ?? ""}
          onChange={(v) => set("buttonIcon", v)}
          label="Button icon"
        />
        <SelectField
          label="Icon position"
          value={values.buttonIconPosition ?? "right"}
          onChange={(v) => set("buttonIconPosition", v as "left" | "right")}
          options={[
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
        <SelectField
          label="Button radius"
          value={values.buttonRadius ?? "full"}
          onChange={(v) => set("buttonRadius", v as DynamicFormAppearance["buttonRadius"])}
          options={RADIUS_OPTS}
        />
        <SelectField
          label="Button size"
          value={values.buttonSize ?? "md"}
          onChange={(v) => set("buttonSize", v as DynamicFormAppearance["buttonSize"])}
          options={SIZE_OPTS}
        />
        <SelectField
          label="Button width"
          value={values.buttonWidth ?? "full"}
          onChange={(v) => set("buttonWidth", v as "auto" | "full")}
          options={[
            { value: "auto", label: "Auto" },
            { value: "full", label: "Full width" },
          ]}
        />
        <SelectField
          label="Button alignment"
          value={values.buttonAlignment ?? "center"}
          onChange={(v) => set("buttonAlignment", v as DynamicFormAppearance["buttonAlignment"])}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
        <div>
          <Label className="text-xs">Loading text</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.loadingText ?? ""}
            onChange={(e) => set("loadingText", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Success text</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.successText ?? ""}
            onChange={(e) => set("successText", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Error text</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={values.errorText ?? ""}
            onChange={(e) => set("errorText", e.target.value)}
          />
        </div>
      </TabsContent>

      <TabsContent value="container" className="space-y-3 mt-3">
        <div>
          <Label className="text-xs">Background</Label>
          <Input
            className="mt-1 h-8 text-sm"
            placeholder="#f8fafc or empty"
            value={values.containerBackground ?? ""}
            onChange={(e) => set("containerBackground", e.target.value)}
          />
        </div>
        <SelectField
          label="Border radius"
          value={values.containerBorderRadius ?? "xl"}
          onChange={(v) =>
            set("containerBorderRadius", v as DynamicFormAppearance["containerBorderRadius"])
          }
          options={RADIUS_OPTS}
        />
        <SelectField
          label="Shadow"
          value={values.containerShadow ?? "none"}
          onChange={(v) => set("containerShadow", v as DynamicFormAppearance["containerShadow"])}
          options={[
            { value: "none", label: "None" },
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ]}
        />
        <SelectField
          label="Padding"
          value={values.containerPadding ?? "lg"}
          onChange={(v) =>
            set("containerPadding", v as DynamicFormAppearance["containerPadding"])
          }
          options={[
            { value: "none", label: "None" },
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "XL" },
          ]}
        />
        <SelectField
          label="Title alignment"
          value={values.titleAlignment ?? "left"}
          onChange={(v) => set("titleAlignment", v as DynamicFormAppearance["titleAlignment"])}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
        <div>
          <Label className="text-xs">Max width</Label>
          <Input
            className="mt-1 h-8 text-sm"
            placeholder="e.g. 640px"
            value={values.maxWidth ?? ""}
            onChange={(e) => set("maxWidth", e.target.value)}
          />
        </div>
      </TabsContent>

      <TabsContent value="layout" className="space-y-3 mt-3">
        <SelectField
          label="Desktop layout"
          value={values.desktopLayout ?? "stacked"}
          onChange={(v) => set("desktopLayout", v as DynamicFormAppearance["desktopLayout"])}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "50/50", label: "50 / 50" },
            { value: "40/60", label: "40 / 60" },
            { value: "60/40", label: "60 / 40" },
            { value: "30/70", label: "30 / 70" },
            { value: "70/30", label: "70 / 30" },
          ]}
        />
        <SelectField
          label="Tablet layout"
          value={values.tabletLayout ?? "stacked"}
          onChange={(v) => set("tabletLayout", v as "stacked" | "sideBySide")}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "sideBySide", label: "Side by side" },
          ]}
        />
        <p className="text-xs text-muted-foreground">Mobile is always stacked.</p>
      </TabsContent>
    </Tabs>
  );
}
