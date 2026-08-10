"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type TrustBadgeItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptyTrustBadgeItem(): TrustBadgeItem {
  return {
    id: newId("tb"),
    icon: "shield",
    imageUrl: "",
    mediaAssetId: "",
    href: "",
    ...emptyLocalizedItemFields(["label", "description"]),
  } as TrustBadgeItem;
}

function TrustBadgeItemForm({
  item,
  onUpdate,
}: {
  item: TrustBadgeItem;
  onUpdate: (patch: Partial<TrustBadgeItem>) => void;
}) {
  return (
    <div className="space-y-3">
      <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
      <UrlPrimaryMediaPickerField
        label="Seal image (optional)"
        mediaTypes={["IMAGE", "SVG"]}
        url={item.imageUrl}
        onPick={({ url, mediaId }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
      />
      <LocalizedItemFields
        fields={[
          { key: "label", label: "Label" },
          { key: "description", label: "Description", multiline: true },
        ]}
        values={item as unknown as Record<string, string>}
        onChange={(patch) => onUpdate(patch as Partial<TrustBadgeItem>)}
      />
      <div>
        <Label className="text-xs">Link href</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={item.href}
          onChange={(e) => onUpdate({ href: e.target.value })}
        />
      </div>
    </div>
  );
}

export function TrustBadgesBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as TrustBadgeItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: TrustBadgeItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.layout as string) ?? "grid"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="grid">Grid</option>
          <option value="inlineStrip">Inline strip</option>
          <option value="compactRow">Compact row</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Registration number</Label>
        <Input className="mt-1 h-8 text-sm" value={(block.props.registrationNo as string) ?? ""} onChange={(e) => setProp("registrationNo", e.target.value)} />
      </div>
      <ModalRepeatableListEditor
        items={items}
        onChange={updateItems}
        createEmpty={emptyTrustBadgeItem}
        strings={{
          sectionLabel: "Badges",
          addButtonLabel: "Add badge",
          emptyLabel: "No badges yet. Click Add badge to create one.",
          dialogTitleCreate: "Add badge",
          dialogTitleEdit: "Edit badge",
          saveButtonLabelCreate: "Save badge",
          saveButtonLabelEdit: "Save badge",
        }}
        renderSummary={(item) => {
          const label = (item.labelEn as string | undefined) ?? "";
          const title = label.trim() ? label : "Untitled badge";
          const link = item.href?.trim();
          return { title, meta: link ? [`Link: ${link}`] : [] };
        }}
        renderForm={(draft, onUpdate) => <TrustBadgeItemForm item={draft} onUpdate={onUpdate} />}
      />
    </div>
  );
}
