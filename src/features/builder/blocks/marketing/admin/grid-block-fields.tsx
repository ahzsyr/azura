"use client";

import type { BlockNode } from "@/types/builder";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  itemFieldPropKey,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type GridItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptyGridItem(): GridItem {
  return {
    id: newId("bg"),
    icon: "compass",
    imageUrl: "",
    mediaAssetId: "",
    href: "",
    ...emptyLocalizedItemFields([
      "title",
      "description",
      "category",
      "linkLabel",
      "metric",
    ]),
  } as GridItem;
}

function GridItemForm({
  item,
  onUpdate,
  showMetric,
}: {
  item: GridItem;
  onUpdate: (patch: Partial<GridItem>) => void;
  showMetric?: boolean;
}) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;

  return (
    <div className="space-y-3">
      <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
      <UrlPrimaryMediaPickerField
        label="Image (optional)"
        mediaTypes={["IMAGE", "SVG"]}
        url={item.imageUrl}
        onPick={({ url, mediaId }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
      />
      <LocalizedItemFields
        fields={[
          { key: "title", label: "Title" },
          { key: "description", label: "Description", multiline: true },
          { key: "category", label: "Category" },
          { key: "linkLabel", label: "Link label" },
          ...(showMetric ? [{ key: "metric", label: "Metric" }] : []),
        ]}
        values={item as unknown as Record<string, string>}
        onChange={(patch) => {
          const nextPatch = { ...patch } as Record<string, string>;
          if (activeCode === defaultCode) {
            for (const key of ["title", "description", "category", "linkLabel", ...(showMetric ? ["metric"] : [])]) {
              const localizedKey = itemFieldPropKey(key, activeCode);
              const value = nextPatch[localizedKey];
              if (typeof value === "string") nextPatch[key] = value;
            }
          }
          onUpdate(nextPatch as Partial<GridItem>);
        }}
      />
      <div>
        <Label className="text-xs">Link href</Label>
        <Input className="mt-1 h-8 text-sm" value={item.href} onChange={(e) => onUpdate({ href: e.target.value })} />
      </div>
    </div>
  );
}

function BenefitsItemsEditor({
  items,
  onChange,
}: {
  items: GridItem[];
  onChange: (next: GridItem[]) => void;
}) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  return (
    <ModalRepeatableListEditor
      items={items}
      onChange={onChange}
      createEmpty={emptyGridItem}
      strings={{
        sectionLabel: "Benefits",
        addButtonLabel: "Add benefit",
        emptyLabel: "No benefits yet. Click Add benefit to create one.",
        dialogTitleCreate: "Add benefit",
        dialogTitleEdit: "Edit benefit",
        saveButtonLabelCreate: "Save benefit",
        saveButtonLabelEdit: "Save benefit",
      }}
      renderSummary={(item) => {
        const localizedValues = item as unknown as Record<string, string>;
        const title =
          readItemFieldValue(localizedValues, "title", activeCode).trim() || "Untitled benefit";
        const category = readItemFieldValue(localizedValues, "category", activeCode).trim();
        const link = item.href?.trim();
        const metric = readItemFieldValue(localizedValues, "metric", activeCode).trim();
        return {
          title,
          meta: [
            ...(category ? [`Category: ${category}`] : []),
            ...(metric ? [`Metric: ${metric}`] : []),
            ...(link ? [`Link: ${link}`] : []),
          ],
        };
      }}
      renderForm={(draft, onUpdate) => (
        <GridItemForm item={draft} onUpdate={onUpdate} showMetric />
      )}
    />
  );
}

export function BenefitsGridBlockFields({ block, onChange }: Props) {
  const items = (block.props.items as GridItem[]) ?? [];
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const updateItems = (next: GridItem[]) => setProp("items", next);

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.layout as string) ?? "cards"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="cards">Cards</option>
          <option value="list">List</option>
          <option value="numbered">Numbered</option>
          <option value="twoColumn">Two column</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Emphasis</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(block.props.emphasis as string) ?? "outcome"} onChange={(e) => setProp("emphasis", e.target.value)}>
          <option value="outcome">Outcome</option>
          <option value="metric">Metric</option>
        </select>
      </div>
      <BenefitsItemsEditor items={items} onChange={updateItems} />
    </div>
  );
}
