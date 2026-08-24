"use client";

import type { BlockNode } from "@/types/builder";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle, LocalizedBlockInput, LocalizedBlockTextarea } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { FormTemplatePickerField } from "@/features/builder/blocks/conversion/admin/form-template-picker-field";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { DynamicFormAppearanceFields } from "@/features/forms/fxs/appearance/DynamicFormAppearanceFields";
import type { DynamicFormAppearance } from "@/features/forms/fxs/appearance/dynamic-form-appearance";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

type TrustItemDraft = { id: string } & Record<string, string>;

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

function newTrustItemId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyTrustItem(id?: string): TrustItemDraft {
  return {
    id: id ?? newTrustItemId(),
    ...emptyLocalizedItemFields(["label"]),
  };
}

/** Normalize a stored row; migrate bare `label` into `labelEn` for the locale editor. */
function normalizeTrustItem(item: unknown, index: number): TrustItemDraft {
  const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const id = typeof row.id === "string" && row.id ? row.id : `t${index + 1}`;
  const next: TrustItemDraft = { id };
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") continue;
    if (typeof value === "string") next[key] = value;
  }
  const bare = typeof row.label === "string" ? row.label : "";
  if (bare && !readItemFieldValue(next, "label", "en").trim()) {
    next.labelEn = bare;
  }
  return next;
}

/** Prefer `trustItems` array; migrate legacy trustItem1/2/3 if present. */
function readTrustItems(props: Record<string, unknown>): TrustItemDraft[] {
  const fromArray = props.trustItems;
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    return fromArray.map((item, index) => normalizeTrustItem(item, index));
  }
  const legacy = ["trustItem1", "trustItem2", "trustItem3"]
    .map((field, index) => {
      const label = props[field];
      if (typeof label !== "string" || !label.trim()) return null;
      return normalizeTrustItem({ id: `t${index + 1}`, label }, index);
    })
    .filter((item): item is TrustItemDraft => Boolean(item));
  return legacy.length
    ? legacy
    : [emptyTrustItem("t1"), emptyTrustItem("t2"), emptyTrustItem("t3")];
}

export function StickyCtaBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="message" label="Message" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Variant</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.variant as string) ?? "bar"}
            onChange={(e) => setProp(block, onChange, "variant", e.target.value)}
          >
            <option value="bar">Bar</option>
            <option value="banner">Banner</option>
            <option value="fab">FAB</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Position</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.position as string) ?? "bottom"}
            onChange={(e) => setProp(block, onChange, "position", e.target.value)}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Trigger</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.trigger as string) ?? "scrollPercent"}
          onChange={(e) => setProp(block, onChange, "trigger", e.target.value)}
        >
          <option value="always">Always</option>
          <option value="scrollPercent">Scroll %</option>
          <option value="delayMs">Delay (ms)</option>
          <option value="exitIntent">Exit intent</option>
        </select>
      </div>
      <Input
        type="number"
        placeholder="Trigger value"
        value={String(block.props.triggerValue ?? 25)}
        onChange={(e) => setProp(block, onChange, "triggerValue", Number(e.target.value))}
      />
      <LocalizedBlockInput block={block} field="primaryButton" label="Primary button" />
      <Input
        placeholder="Primary URL"
        value={(block.props.primaryHref as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "primaryHref", e.target.value)}
      />
      <LocalizedBlockInput block={block} field="secondaryButton" label="Secondary button" />
      <Input
        placeholder="Secondary URL"
        value={(block.props.secondaryHref as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "secondaryHref", e.target.value)}
      />
    </div>
  );
}

export function LeadFormBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="subtitle" label="Subtitle" />
      <LocalizedBlockInput block={block} field="incentive" label="Incentive" />
      <LocalizedBlockInput block={block} field="successMessage" label="Success message" />
      <FormTemplatePickerField block={block} onChange={onChange} categoryFilter="LEAD" />
      <ExperienceFields block={block} onChange={onChange} />
      <LayoutFields block={block} onChange={onChange} />
    </div>
  );
}

function TrustItemsEditor({ block, onChange }: Props) {
  const items = readTrustItems(block.props as Record<string, unknown>);

  const updateItems = (next: TrustItemDraft[]) => {
    setProp(block, onChange, "trustItems", next);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Trust items</Label>
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <LocalizedItemFields
              fields={[{ key: "label", label: `Trust item ${index + 1}` }]}
              values={item}
              onChange={(patch) => {
                const next = items.map((row) =>
                  row.id === item.id ? { ...row, ...patch } : row,
                );
                updateItems(next);
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Remove trust item ${index + 1}`}
            onClick={() => updateItems(items.filter((row) => row.id !== item.id))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => updateItems([...items, emptyTrustItem()])}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add trust item
      </Button>
    </div>
  );
}

function ExperienceFields({ block, onChange }: Props) {
  return (
    <>
      <LocalizedBlockInput block={block} field="heroTitle" label="Hero title" />
      <LocalizedBlockTextarea block={block} field="heroDescription" label="Hero description" rows={3} />
      <Input
        type="number"
        placeholder="Estimated minutes"
        value={String(block.props.heroEstimatedMinutes ?? "")}
        onChange={(e) =>
          setProp(
            block,
            onChange,
            "heroEstimatedMinutes",
            e.target.value === "" ? undefined : Number(e.target.value),
          )
        }
      />
      <TrustItemsEditor block={block} onChange={onChange} />
      <LocalizedBlockInput block={block} field="formSectionTitle" label="Form section title" />
    </>
  );
}

function LayoutFields({ block, onChange }: Props) {
  const layout = (block.props.layout as string) ?? "stacked";
  return (
    <>
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={layout}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="stacked">Stacked</option>
          <option value="inline">Inline</option>
          <option value="twoColumn">Two column</option>
          <option value="responsiveGrid">Responsive grid</option>
          <option value="sectionCard">Section cards</option>
          <option value="split">Split (hero + form)</option>
          <option value="sidebar">Sidebar navigation</option>
          <option value="conversational">Conversational</option>
          <option value="review">Review / summary</option>
        </select>
      </div>
      {layout === "twoColumn" && (
        <div>
          <Label className="text-xs">Column ratio</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.columnRatio as string) ?? "50/50"}
            onChange={(e) => setProp(block, onChange, "columnRatio", e.target.value)}
          >
            <option value="50/50">50 / 50</option>
            <option value="40/60">40 / 60</option>
            <option value="60/40">60 / 40</option>
            <option value="30/70">30 / 70</option>
            <option value="70/30">70 / 30</option>
          </select>
        </div>
      )}
      <div>
        <Label className="text-xs">Section style</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.sectionStyle as string) ?? "card"}
          onChange={(e) => setProp(block, onChange, "sectionStyle", e.target.value)}
        >
          <option value="card">Card</option>
          <option value="flat">Flat</option>
          <option value="bordered">Bordered</option>
          <option value="filled">Filled</option>
          <option value="collapsible">Collapsible</option>
        </select>
      </div>
    </>
  );
}

export function ContactFormBuilderBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="successMessage" label="Success message" />
      <FormTemplatePickerField block={block} onChange={onChange} categoryFilter="CONTACT" />
      <ExperienceFields block={block} onChange={onChange} />
      <LayoutFields block={block} onChange={onChange} />
      <div className="border-t pt-3">
        <Label className="text-xs font-medium">Form appearance</Label>
        <div className="mt-2">
          <DynamicFormAppearanceFields
            values={block.props as Partial<DynamicFormAppearance>}
            onChange={(patch) => onChange(patchBlockSettings(block, patch as Record<string, unknown>))}
          />
        </div>
      </div>
    </div>
  );
}

export function MultiStepFormBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="successMessage" label="Success message" />
      <FormTemplatePickerField block={block} onChange={onChange} categoryFilter="MULTI_STEP" />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.saveAndResume !== false}
          onChange={(e) => setProp(block, onChange, "saveAndResume", e.target.checked)}
        />
        Save and resume
      </label>
      <ExperienceFields block={block} onChange={onChange} />
      <LayoutFields block={block} onChange={onChange} />
    </div>
  );
}

export function NewsletterSignupBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="subtitle" label="Subtitle" />
      <LocalizedBlockInput block={block} field="incentive" label="Incentive" />
      <LocalizedBlockInput block={block} field="successMessage" label="Success message" />
      <LocalizedBlockInput block={block} field="pendingMessage" label="Pending message" />
      <Input
        placeholder="Segment"
        value={(block.props.segment as string) ?? "default"}
        onChange={(e) => setProp(block, onChange, "segment", e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.doubleOptIn !== false}
          onChange={(e) => setProp(block, onChange, "doubleOptIn", e.target.checked)}
        />
        Double opt-in
      </label>
      <Input
        placeholder="Webhook URL (optional)"
        value={(block.props.webhookUrl as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "webhookUrl", e.target.value)}
      />
    </div>
  );
}

export function DownloadGateBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="description" label="Description" />
      <LocalizedBlockInput block={block} field="fileLabel" label="File label" />
      <LocalizedBlockInput block={block} field="successMessage" label="Unlock success message" />
      <Input
        placeholder="Media asset ID"
        value={(block.props.mediaAssetId as string) ?? ""}
        onChange={(e) => setProp(block, onChange, "mediaAssetId", e.target.value)}
      />
      <div>
        <Label className="text-xs">Unlock method</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.unlockMethod as string) ?? "formTemplate"}
          onChange={(e) => setProp(block, onChange, "unlockMethod", e.target.value)}
        >
          <option value="formTemplate">Form submission</option>
          <option value="newsletter">Newsletter signup</option>
          <option value="externalUrl">External URL</option>
        </select>
      </div>
      {(block.props.unlockMethod as string) !== "externalUrl" && (
        <FormTemplatePickerField block={block} onChange={onChange} />
      )}
      {(block.props.unlockMethod as string) === "externalUrl" && (
        <Input
          placeholder="External URL"
          value={(block.props.externalUrl as string) ?? ""}
          onChange={(e) => setProp(block, onChange, "externalUrl", e.target.value)}
        />
      )}
    </div>
  );
}
