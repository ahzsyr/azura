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

type Column = { id: string; sortable: boolean; [key: string]: string | boolean };
type Row = { id: string; cells: Record<string, string> };

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function TableBlockFields({ block, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? "en";
  const columns = (block.props.columns as Column[]) ?? [];
  const rows = (block.props.rows as Row[]) ?? [];
  const features = (block.props.features as Record<string, unknown>) ?? {};

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const setFeatures = (patch: Record<string, unknown>) => {
    setProp("features", { ...features, ...patch });
  };

  const updateColumns = (next: Column[]) => {
    const nextRows = rows.map((row) => {
      const cells: Record<string, string> = {};
      for (const col of next) {
        cells[col.id] = row.cells[col.id] ?? "";
      }
      return { ...row, cells };
    });
    onChange(patchBlockSettings(block, { columns: next, rows: nextRows }));
  };

  const updateRows = (next: Row[]) => setProp("rows", next);

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <ModalRepeatableListEditor
        items={columns}
        onChange={updateColumns}
        createEmpty={() => ({ id: newId("col"), sortable: true, ...emptyLocalizedItemFields(["label"]) })}
        strings={{
          sectionLabel: "Columns",
          addButtonLabel: "Add column",
          emptyLabel: "No columns yet. Click Add column to create one.",
          dialogTitleCreate: "Add column",
          dialogTitleEdit: "Edit column",
          saveButtonLabelCreate: "Save column",
          saveButtonLabelEdit: "Save column",
        }}
        renderSummary={(col) => ({
          title:
            readItemFieldValue(col as unknown as Record<string, string>, "label", activeCode) || col.id,
          meta: [col.sortable ? "Sortable" : "Not sortable"],
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
                checked={Boolean(draft.sortable)}
                onChange={(e) => onUpdate({ sortable: e.target.checked })}
              />
              Sortable
            </label>
          </div>
        )}
      />

      <ModalRepeatableListEditor
        items={rows}
        onChange={updateRows}
        createEmpty={() => {
          const cells: Record<string, string> = {};
          for (const col of columns) cells[col.id] = "";
          return { id: newId("row"), cells };
        }}
        strings={{
          sectionLabel: "Rows",
          addButtonLabel: "Add row",
          emptyLabel: "No rows yet. Click Add row to create one.",
          dialogTitleCreate: "Add row",
          dialogTitleEdit: "Edit row",
          saveButtonLabelCreate: "Save row",
          saveButtonLabelEdit: "Save row",
        }}
        renderSummary={(row, index) => ({
          title: `Row ${index + 1}`,
          meta: [`${Object.values(row.cells).filter((v) => String(v).trim().length > 0).length} filled cells`],
        })}
        renderForm={(draft, onUpdate) => (
          <div className="space-y-3">
            {columns.map((col) => (
              <div key={col.id}>
                <Label className="text-xs">
                  {readItemFieldValue(col as unknown as Record<string, string>, "label", activeCode) || col.id}
                </Label>
                <Input
                  className="mt-1"
                  value={draft.cells[col.id] ?? ""}
                  onChange={(e) =>
                    onUpdate({ cells: { ...draft.cells, [col.id]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        )}
      />

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-sm font-medium">Features</p>
        {(["sortable", "filterable", "searchable", "paginated"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm capitalize">
            <input
              type="checkbox"
              checked={Boolean(features[key])}
              onChange={(e) => setFeatures({ [key]: e.target.checked })}
            />
            {key}
          </label>
        ))}
        <Input
          type="number"
          placeholder="Page size"
          value={String((features.pageSize as number) ?? 10)}
          onChange={(e) => setFeatures({ pageSize: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
