"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import { ItemCard, RepeatableSection } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
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

      <RepeatableSection
        label="Columns / Plans"
        onAdd={() =>
          updateColumns([
            ...columns,
            { id: newId("col"), highlighted: false, ...emptyLocalizedItemFields(["label"]) },
          ])
        }
      >
        {columns.map((col) => (
          <ItemCard key={col.id} onRemove={() => updateColumns(columns.filter((c) => c.id !== col.id))}>
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
                checked={Boolean(col.highlighted)}
                onChange={(e) =>
                  updateColumns(columns.map((c) => (c.id === col.id ? { ...c, highlighted: e.target.checked } : c)))
                }
              />
              Highlight column
            </label>
          </ItemCard>
        ))}
      </RepeatableSection>

      <RepeatableSection
        label="Feature rows"
        onAdd={() => {
          const values: Record<string, string> = {};
          for (const col of columns) values[col.id] = "";
          updateRows([
            ...rows,
            { id: newId("row"), ...emptyLocalizedItemFields(["label"]), values },
          ]);
        }}
      >
        {rows.map((row) => (
          <ItemCard key={row.id} onRemove={() => updateRows(rows.filter((r) => r.id !== row.id))}>
            <LocalizedItemFields
              fields={[{ key: "label", label: "Feature label" }]}
              values={row as Record<string, string>}
              onChange={(patch) =>
                updateRows(rows.map((r) => (r.id === row.id ? { ...r, ...patch } : r)))
              }
            />
            {columns.map((col) => (
              <div key={col.id}>
                <Label className="text-xs">{readItemFieldValue(col as Record<string, string>, "label", activeCode) || col.id}</Label>
                <Input
                  value={String(row.values[col.id] ?? "")}
                  onChange={(e) =>
                    updateRows(
                      rows.map((r) =>
                        r.id === row.id
                          ? { ...r, values: { ...r.values, [col.id]: e.target.value } }
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
    </div>
  );
}
