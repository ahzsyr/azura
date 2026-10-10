"use client";

import type { FooterContactItem, FooterContactItemType } from "../../types";
import type { SectionEditorProps } from "../types";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import { FooterContactItemTextField } from "@/features/footer/admin/footer-localized-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultContactItemIcon, emptyFooterContactItem } from "./schema";

const TYPE_OPTIONS: { value: Exclude<FooterContactItemType, "custom">; label: string }[] = [
  { value: "phone", label: "Phone number" },
  { value: "email", label: "Email address" },
  { value: "address", label: "Street address" },
  { value: "text", label: "Text" },
  { value: "richtext", label: "Rich text" },
];

const TYPE_LABEL: Record<FooterContactItemType, string> = {
  phone: "Phone",
  email: "Email",
  address: "Address",
  text: "Text",
  richtext: "Rich text",
  custom: "Rich text",
};

function editorType(type: FooterContactItemType): Exclude<FooterContactItemType, "custom"> {
  return type === "custom" ? "richtext" : type;
}

function isRich(type: FooterContactItemType): boolean {
  return type === "richtext" || type === "custom";
}

function isPlainText(type: FooterContactItemType): boolean {
  return type === "text" || isRich(type);
}

function summaryText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type ContactItemFormProps = {
  columnId: string;
  item: FooterContactItem;
  onUpdate: (patch: Partial<FooterContactItem>) => void;
};

function ContactItemForm({ columnId, item, onUpdate }: ContactItemFormProps) {
  const type = editorType(item.type);
  const showLink = type === "phone" || type === "email" || type === "address";

  function changeType(next: Exclude<FooterContactItemType, "custom">) {
    const previousDefault = defaultContactItemIcon(item.type);
    const nextDefault = defaultContactItemIcon(next);
    const icon = !item.icon || item.icon === previousDefault ? nextDefault : item.icon;
    onUpdate({ type: next, icon });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Type</Label>
        <select
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={type}
          onChange={(e) => changeType(e.target.value as Exclude<FooterContactItemType, "custom">)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <IconNameSelect value={item.icon ?? ""} onChange={(icon) => onUpdate({ icon })} />

      <FooterContactItemTextField
        columnId={columnId}
        itemId={item.id}
        field="label"
        label="Label"
        defaultValue={item.label ?? ""}
        onDefaultChange={(label) => onUpdate({ label })}
      />

      {isPlainText(item.type) ? (
        <FooterContactItemTextField
          columnId={columnId}
          itemId={item.id}
          field="value"
          label={isRich(item.type) ? "Rich text" : "Text"}
          defaultValue={item.value}
          multiline
          rows={isRich(item.type) ? 6 : 3}
          onDefaultChange={(value) => onUpdate({ value })}
        />
      ) : (
        <div>
          <Label className="text-xs">Value</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={item.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder={
              type === "phone"
                ? "+1 234 567 890"
                : type === "email"
                  ? "contact@example.com"
                  : "123 Main St, City"
            }
          />
        </div>
      )}

      {isRich(item.type) ? (
        <p className="text-xs text-muted-foreground">
          HTML is supported, for example &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt;, and line breaks.
        </p>
      ) : null}

      {showLink ? (
        <div>
          <Label className="text-xs">Link (optional)</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={item.url ?? ""}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder={
              type === "phone"
                ? "tel:+1234567890"
                : type === "email"
                  ? "mailto:contact@example.com"
                  : "https://maps.google.com/..."
            }
          />
        </div>
      ) : null}

      <div>
        <Label className="text-xs">Badge (optional)</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={item.badge ?? ""}
          onChange={(e) => onUpdate({ badge: e.target.value })}
          placeholder="24/7, Main, Branch"
        />
      </div>

      {showLink ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={item.openInNewTab === true}
            onChange={(e) => onUpdate({ openInNewTab: e.target.checked })}
          />
          Open in new tab
        </label>
      ) : null}
    </div>
  );
}

export function ContactEditor({ column, onUpdate }: SectionEditorProps) {
  const items = column.customContactItems ?? [];

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">Custom lines</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add as many extra phone numbers, emails, addresses, text lines, or rich text blocks as you need.
        </p>
      </div>
      <ModalRepeatableListEditor
        items={items}
        onChange={(next) => onUpdate({ customContactItems: next })}
        createEmpty={() => emptyFooterContactItem("phone")}
        strings={{
          sectionLabel: "Items",
          addButtonLabel: "Add line",
          emptyLabel: "No custom lines yet.",
          dialogTitleCreate: "Add contact line",
          dialogTitleEdit: "Edit contact line",
          dialogDescription: "Choose a type, then enter the label and content.",
          saveButtonLabelCreate: "Save",
          saveButtonLabelEdit: "Save",
        }}
        renderSummary={(item) => ({
          title: item.label?.trim() || TYPE_LABEL[item.type],
          meta: [TYPE_LABEL[item.type], summaryText(item.value)].filter(Boolean),
        })}
        renderForm={(item, update) => (
          <ContactItemForm columnId={column.id} item={item} onUpdate={update} />
        )}
      />
    </div>
  );
}
