"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle, LocalizedBlockInput, LocalizedBlockTextarea } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { FormTemplatePickerField } from "@/features/conversion-blocks/admin/form-template-picker-field";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
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
    </div>
  );
}

export function ContactFormBuilderBlockFields({ block, onChange }: Props) {
  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockInput block={block} field="successMessage" label="Success message" />
      <FormTemplatePickerField block={block} onChange={onChange} categoryFilter="CONTACT" />
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "stacked"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="stacked">Stacked</option>
          <option value="inline">Inline</option>
          <option value="twoColumn">Two column</option>
        </select>
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
