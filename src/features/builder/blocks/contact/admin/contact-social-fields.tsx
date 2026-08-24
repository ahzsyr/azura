"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  NestedLocalizedRowInput,
  getRowLocalizedValue,
} from "@/features/translation/components/nested-localized-row-field";
import {
  ContactAdminTabs,
  SelectField,
  makeContactSetProp,
} from "@/features/builder/blocks/contact/admin/shared-contact-fields";
import {
  emptySocialItem,
  type SocialItem,
} from "@/features/builder/blocks/contact/schemas/social";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function SocialItemForm({
  item,
  onUpdate,
}: {
  item: SocialItem;
  onUpdate: (patch: Partial<SocialItem>) => void;
}) {
  return (
    <div className="space-y-3">
      <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
      <div>
        <Label className="text-xs">Platform</Label>
        <NestedLocalizedRowInput row={item} field="platform" label="Platform" onChange={(next) => onUpdate(next)} />
      </div>
      <div>
        <Label className="text-xs">Label</Label>
        <NestedLocalizedRowInput row={item} field="label" label="Label" onChange={(next) => onUpdate(next)} />
      </div>
      <div>
        <Label className="text-xs">URL</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={item.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
        />
      </div>
    </div>
  );
}

export function ContactSocialBlockFields({ block, onChange }: Props) {
  const setProp = makeContactSetProp(block, onChange);
  const p = block.props;
  const items = (p.items as SocialItem[]) ?? [];

  return (
    <ContactAdminTabs
      block={block}
      onChange={onChange}
      showItems
      content={
        <>
          <SelectField
            label="Layout"
            value={(p.layout as string) ?? "row"}
            onChange={(v) => setProp("layout", v)}
            options={[
              { value: "row", label: "Row" },
              { value: "grid", label: "Grid" },
              { value: "vertical", label: "Vertical" },
            ]}
          />
          <SelectField
            label="Icon shape"
            value={(p.iconShape as string) ?? "circle"}
            onChange={(v) => setProp("iconShape", v)}
            options={[
              { value: "circle", label: "Circle" },
              { value: "rounded", label: "Rounded" },
              { value: "square", label: "Square" },
            ]}
          />
          <SelectField
            label="Icon size"
            value={(p.iconSize as string) ?? "md"}
            onChange={(v) => setProp("iconSize", v)}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
          <SelectField
            label="Gap"
            value={(p.gap as string) ?? "md"}
            onChange={(v) => setProp("gap", v)}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
          <SelectField
            label="Hover effect"
            value={(p.hoverEffect as string) ?? "scale"}
            onChange={(v) => setProp("hoverEffect", v)}
            options={[
              { value: "none", label: "None" },
              { value: "scale", label: "Scale" },
              { value: "fill", label: "Fill" },
              { value: "color", label: "Color" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(p.showLabels)}
              onChange={(e) => setProp("showLabels", e.target.checked)}
            />
            Show labels
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(p.showFollowBtn)}
              onChange={(e) => setProp("showFollowBtn", e.target.checked)}
            />
            Show follow button
          </label>
          <div>
            <Label className="text-xs">Response note</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="Response in ~2h on business days"
              value={(p.responseNote as string) ?? ""}
              onChange={(e) => setProp("responseNote", e.target.value)}
            />
          </div>
        </>
      }
      items={
        <ModalRepeatableListEditor
          items={items}
          onChange={(next) => setProp("items", next)}
          createEmpty={emptySocialItem}
          strings={{
            sectionLabel: "Social links",
            addButtonLabel: "Add link",
            emptyLabel: "No social links yet.",
            dialogTitleCreate: "Add social link",
            dialogTitleEdit: "Edit social link",
            saveButtonLabelCreate: "Save",
            saveButtonLabelEdit: "Save",
          }}
          renderSummary={(item) => ({
            title:
              getRowLocalizedValue(item as unknown as Record<string, unknown>, "label", "en").trim() ||
              getRowLocalizedValue(item as unknown as Record<string, unknown>, "platform", "en").trim() ||
              item.label?.trim() ||
              item.platform?.trim() ||
              "Untitled",
            meta: item.url ? [item.url] : [],
          })}
          renderForm={(draft, onUpdate) => (
            <SocialItemForm item={draft} onUpdate={onUpdate} />
          )}
        />
      }
    />
  );
}
