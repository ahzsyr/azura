"use client";

import type { BlockNode } from "@/types/builder";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  itemFieldPropKey,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type LogoItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptyLogoItem(): LogoItem {
  return {
    id: newId("logo"),
    imageUrl: "",
    mediaAssetId: "",
    href: "",
    ...emptyLocalizedItemFields(["name", "category"]),
  } as LogoItem;
}

function LogoItemForm({
  item,
  onUpdate,
}: {
  item: LogoItem;
  onUpdate: (patch: Partial<LogoItem>) => void;
}) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;

  return (
    <div className="space-y-3">
      <UrlPrimaryMediaPickerField
        label="Logo image"
        mediaTypes={["IMAGE", "SVG"]}
        url={item.imageUrl}
        onPick={({ url, mediaId }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
      />
      <LocalizedItemFields
        fields={[
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
        ]}
        values={item as unknown as Record<string, string>}
        onChange={(patch) => {
          const nextPatch = { ...patch } as Record<string, string>;
          // Keep legacy/base keys in sync when editing the default locale.
          if (activeCode === defaultCode) {
            for (const key of ["name", "category"]) {
              const localizedKey = itemFieldPropKey(key, activeCode);
              const value = nextPatch[localizedKey];
              if (typeof value === "string") nextPatch[key] = value;
            }
          }
          onUpdate(nextPatch as Partial<LogoItem>);
        }}
      />
      <div>
        <Label className="text-xs">Link href</Label>
        <Input className="mt-1 h-8 text-sm" value={item.href} onChange={(e) => onUpdate({ href: e.target.value })} />
      </div>
    </div>
  );
}

function LogoCloudItemsEditor({
  items,
  onChange,
}: {
  items: LogoItem[];
  onChange: (next: LogoItem[]) => void;
}) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  return (
    <ModalRepeatableListEditor
      items={items}
      onChange={onChange}
      createEmpty={emptyLogoItem}
      strings={{
        sectionLabel: "Logos",
        addButtonLabel: "Add logo",
        emptyLabel: "No logos yet. Click Add logo to create one.",
        dialogTitleCreate: "Add logo",
        dialogTitleEdit: "Edit logo",
        saveButtonLabelCreate: "Save logo",
        saveButtonLabelEdit: "Save logo",
      }}
      renderSummary={(item, index) => {
        const localizedValues = item as unknown as Record<string, string>;
        const name = readItemFieldValue(localizedValues, "name", activeCode).trim() || "Untitled logo";
        const category = readItemFieldValue(localizedValues, "category", activeCode).trim();
        const link = item.href?.trim();
        return {
          title: name,
          meta: [
            ...(category ? [`Category: ${category}`] : []),
            ...(link ? [`Link: ${link}`] : []),
          ],
        };
      }}
      renderForm={(draft, onUpdate) => (
        <LogoItemForm item={draft} onUpdate={onUpdate} />
      )}
    />
  );
}

export function LogoCloudBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as LogoItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: LogoItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Display mode</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.displayMode as string) ?? "grid"} onChange={(e) => setProp("displayMode", e.target.value)}>
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
          <option value="marquee">Marquee</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Columns</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={String(block.props.columns ?? 5)} onChange={(e) => setProp("columns", Number(e.target.value))}>
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Logo size</Label>
          <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.logoSize as string) ?? "md"} onChange={(e) => setProp("logoSize", e.target.value)}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.props.grayscale !== false} onChange={(e) => setProp("grayscale", e.target.checked)} />
        Grayscale
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.props.grayscaleHover !== false} onChange={(e) => setProp("grayscaleHover", e.target.checked)} />
        Color on hover
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(block.props.groupByCategory)} onChange={(e) => setProp("groupByCategory", e.target.checked)} />
        Group by category
      </label>
      <LogoCloudItemsEditor items={items} onChange={updateItems} />
    </div>
  );
}
