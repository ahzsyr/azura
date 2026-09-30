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
  makeContactSetProp,
} from "@/features/builder/blocks/contact/admin/shared-contact-fields";
import {
  emptyContactPhoneItem,
  type ContactPhoneItem,
} from "@/features/builder/blocks/contact/schemas/phone";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function PhoneItemForm({
  item,
  onUpdate,
}: {
  item: ContactPhoneItem;
  onUpdate: (patch: Partial<ContactPhoneItem>) => void;
}) {
  return (
    <div className="space-y-3">
      <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
      <div>
        <Label className="text-xs">Title</Label>
        <NestedLocalizedRowInput row={item} field="itemTitle" label="Title" onChange={(next) => onUpdate(next)} />
      </div>
      <div>
        <Label className="text-xs">Subtitle</Label>
        <NestedLocalizedRowInput row={item} field="subtitle" label="Subtitle" onChange={(next) => onUpdate(next)} />
      </div>
      <div>
        <Label className="text-xs">Value</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={item.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">URL</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={item.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Badge</Label>
        <NestedLocalizedRowInput row={item} field="badge" label="Badge" onChange={(next) => onUpdate(next)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={item.openNewTab}
          onChange={(e) => onUpdate({ openNewTab: e.target.checked })}
        />
        Open in new tab
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={item.showCopyBtn}
          onChange={(e) => onUpdate({ showCopyBtn: e.target.checked })}
        />
        Show copy button
      </label>
    </div>
  );
}

export function ContactPhoneBlockFields({ block, onChange }: Props) {
  const setProp = makeContactSetProp(block, onChange);
  const items = (block.props.items as ContactPhoneItem[]) ?? [];

  return (
    <ContactAdminTabs
      block={block}
      onChange={onChange}
      showItems
      content={
        <p className="text-xs text-muted-foreground">
          Add any contact method — phone, email, WhatsApp, support, fax, etc.
        </p>
      }
      items={
        <ModalRepeatableListEditor
          items={items}
          onChange={(next) => setProp("items", next)}
          createEmpty={emptyContactPhoneItem}
          strings={{
            sectionLabel: "Contact methods",
            addButtonLabel: "Add method",
            emptyLabel: "No contact methods yet.",
            dialogTitleCreate: "Add contact method",
            dialogTitleEdit: "Edit contact method",
            saveButtonLabelCreate: "Save",
            saveButtonLabelEdit: "Save",
          }}
          renderSummary={(item) => ({
            title:
              getRowLocalizedValue(item as unknown as Record<string, unknown>, "itemTitle", "en").trim() ||
              item.itemTitle?.trim() ||
              item.value?.trim() ||
              "Untitled",
            meta: [item.value, item.badge].filter(Boolean) as string[],
          })}
          renderForm={(draft, onUpdate) => (
            <PhoneItemForm item={draft} onUpdate={onUpdate} />
          )}
        />
      }
    />
  );
}
