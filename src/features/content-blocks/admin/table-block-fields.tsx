"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/content-blocks/schemas/content-blocks";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/marketing-blocks/admin/localized-item-fields";

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
      <RepeatableSection
        label="Columns"
        onAdd={() =>
          updateColumns([
            ...columns,
            { id: newId("col"), sortable: true, ...emptyLocalizedItemFields(["label"]) },
          ])
        }
      >
        {columns.map((col) => (
          <ItemCard
            key={col.id}
            onRemove={() => updateColumns(columns.filter((c) => c.id !== col.id))}
          >
            <LocalizedItemFields
              fields={[{ key: "label", label: "Column label" }]}
              values={col as Record<string, string>}
              onChange={(patch) =>
                updateColumns(columns.map((c) => (c.id === col.id ? { ...c, ...patch } : c)))
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={col.sortable}
                onChange={(e) =>
                  updateColumns(columns.map((c) => (c.id === col.id ? { ...c, sortable: e.target.checked } : c)))
                }
              />
              Sortable
            </label>
          </ItemCard>
        ))}
      </RepeatableSection>

      <RepeatableSection
        label="Rows"
        onAdd={() => {
          const cells: Record<string, string> = {};
          for (const col of columns) cells[col.id] = "";
          updateRows([...rows, { id: newId("row"), cells }]);
        }}
      >
        {rows.map((row) => (
          <ItemCard key={row.id} onRemove={() => updateRows(rows.filter((r) => r.id !== row.id))}>
            {columns.map((col) => (
              <div key={col.id}>
                <Label className="text-xs">
                  {readItemFieldValue(col as Record<string, string>, "label", activeCode) || col.id}
                </Label>
                <Input
                  value={row.cells[col.id] ?? ""}
                  onChange={(e) =>
                    updateRows(
                      rows.map((r) =>
                        r.id === row.id
                          ? { ...r, cells: { ...r.cells, [col.id]: e.target.value } }
                          : r
                      )
                    )
                  }
                />
              </div>
            ))}
          </ItemCard>
        ))}
      </RepeatableSection>

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
