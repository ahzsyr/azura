"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";

type Column = { id: string; highlighted?: boolean; [key: string]: string | boolean | undefined };
type Row = { id: string; values: Record<string, string | boolean>; [key: string]: string | Record<string, string | boolean> | undefined };

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function ComparisonBlockFields({ block, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? "en";
  const columns = (block.props.columns as Column[]) ?? [];
  const rows = (block.props.rows as Row[]) ?? [];

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const updateColumns = (next: Column[]) => {
    const nextRows = rows.map((row) => {
      const values: Record<string, string | boolean> = {};
      for (const col of next) {
        values[col.id] = row.values[col.id] ?? "";
      }
      return { ...row, values };
    });
    onChange(patchBlockSettings(block, { columns: next, rows: nextRows }));
  };

  const updateRows = (next: Row[]) => setProp("rows", next);

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Source</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.source as string) ?? "manual"}
          onChange={(e) => setProp("source", e.target.value)}
        >
          <option value="manual">Manual matrix</option>
          <option value="contentType">Content type items</option>
          <option value="catalog">Catalog items</option>
        </select>
      </div>

      {(block.props.source === "contentType" || block.props.source === "catalog") && (
        <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
          {block.props.source === "contentType" && (
            <Input
              placeholder="Content type slug"
              value={(block.props.contentTypeSlug as string) ?? ""}
              onChange={(e) => setProp("contentTypeSlug", e.target.value)}
            />
          )}
          {block.props.source === "catalog" && (
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={(block.props.catalogSource as string) ?? "packages"}
              onChange={(e) => setProp("catalogSource", e.target.value)}
            >
              <option value="packages">Packages</option>
              <option value="hotels">Hotels</option>
              <option value="services">Services</option>
            </select>
          )}
          <Input
            placeholder="Item IDs (comma-separated)"
            value={((block.props.itemIds as string[]) ?? []).join(", ")}
            onChange={(e) =>
              setProp(
                "itemIds",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
          <Input
            placeholder="Attribute keys (comma-separated, optional)"
            value={((block.props.attributeKeys as string[]) ?? []).join(", ")}
            onChange={(e) =>
              setProp(
                "attributeKeys",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "table"}
          onChange={(e) => setProp("layout", e.target.value)}
        >
          <option value="table">Table</option>
          <option value="cards">Cards</option>
          <option value="sideBySide">Side by side</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.highlightDifferences !== false}
          onChange={(e) => setProp("highlightDifferences", e.target.checked)}
        />
        Highlight differences
      </label>

      <ModalRepeatableListEditor
        items={columns}
        onChange={updateColumns}
        createEmpty={() => ({ id: newId("col"), highlighted: false, ...emptyLocalizedItemFields(["label"]) })}
        strings={{
          sectionLabel: "Columns / Plans",
          addButtonLabel: "Add plan",
          emptyLabel: "No plans yet. Click Add plan to create one.",
          dialogTitleCreate: "Add plan",
          dialogTitleEdit: "Edit plan",
          saveButtonLabelCreate: "Save plan",
          saveButtonLabelEdit: "Save plan",
        }}
        renderSummary={(col) => ({
          title:
            readItemFieldValue(col as unknown as Record<string, string>, "label", activeCode) || col.id,
          meta: [col.highlighted ? "Highlighted" : "Normal"],
        })}
        renderForm={(draft, onUpdate) => (
          <div className="space-y-3">
            <LocalizedItemFields
              fields={[{ key: "label", label: "Column label" }]}
              values={draft as unknown as Record<string, string>}
              onChange={(patch) => onUpdate(patch as Partial<Column>)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(draft.highlighted)}
                onChange={(e) => onUpdate({ highlighted: e.target.checked })}
              />
              Highlight column
            </label>
          </div>
        )}
      />

      <ModalRepeatableListEditor
        items={rows}
        onChange={updateRows}
        createEmpty={() => {
          const values: Record<string, string> = {};
          for (const col of columns) values[col.id] = "";
          return { id: newId("row"), ...emptyLocalizedItemFields(["label"]), values } as Row;
        }}
        strings={{
          sectionLabel: "Feature rows",
          addButtonLabel: "Add row",
          emptyLabel: "No feature rows yet. Click Add row to create one.",
          dialogTitleCreate: "Add row",
          dialogTitleEdit: "Edit row",
          saveButtonLabelCreate: "Save row",
          saveButtonLabelEdit: "Save row",
        }}
        renderSummary={(row, index) => ({
          title: ((row.labelEn as string | undefined) ?? "").trim() || `Feature ${index + 1}`,
          meta: [`${columns.length} plan values`],
        })}
        renderForm={(draft, onUpdate) => (
          <div className="space-y-3">
            <LocalizedItemFields
              fields={[{ key: "label", label: "Feature label" }]}
              values={draft as Record<string, string>}
              onChange={(patch) => onUpdate(patch as Partial<Row>)}
            />
            {columns.map((col) => (
              <div key={col.id}>
                <Label className="text-xs">
                  {readItemFieldValue(col as unknown as Record<string, string>, "label", activeCode) || col.id}
                </Label>
                <Input
                  className="mt-1"
                  value={String(draft.values[col.id] ?? "")}
                  onChange={(e) =>
                    onUpdate({ values: { ...draft.values, [col.id]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
