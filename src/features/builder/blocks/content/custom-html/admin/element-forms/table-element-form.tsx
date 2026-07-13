"use client";

import { useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import type { HtmlElement, HtmlElementAttributes } from "../../types";
import {
  extractTableData,
  patchTableStructure,
  type ColumnDef,
  type TableCellData,
  type TableRowData,
} from "../../lib/table-structure";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getColCount(element: HtmlElement): number {
  const headerRow = element.children
    ?.find((c) => c.tag === "thead")
    ?.children?.[0];
  const bodyRow = element.children
    ?.find((c) => c.tag === "tbody")
    ?.children?.[0];
  return Math.max(
    headerRow?.children?.length ?? 0,
    bodyRow?.children?.length ?? 0,
    1
  );
}

// ─── Column form ─────────────────────────────────────────────────────────────

function ColumnForm({
  draft,
  onUpdate,
}: {
  draft: ColumnDef;
  onUpdate: (patch: Partial<ColumnDef>) => void;
}) {
  return (
    <div className="space-y-3 p-1">
      <div>
        <Label className="text-xs">Label</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={draft.label}
          placeholder="Column header"
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Width</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={draft.width ?? ""}
            placeholder="e.g. 120px or 20%"
            onChange={(e) => onUpdate({ width: e.target.value || undefined })}
          />
        </div>
        <div>
          <Label className="text-xs">Alignment</Label>
          <select
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm"
            value={draft.align ?? ""}
            onChange={(e) =>
              onUpdate({
                align: (e.target.value as ColumnDef["align"]) || undefined,
              })
            }
          >
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Row form ────────────────────────────────────────────────────────────────

function RowForm({
  draft,
  onUpdate,
  columns,
  cellTag,
}: {
  draft: TableRowData;
  onUpdate: (patch: Partial<TableRowData>) => void;
  columns: ColumnDef[];
  cellTag: "th" | "td";
}) {
  const updateCell = (i: number, patch: Partial<TableCellData>) => {
    const cells = [...draft.cells];
    cells[i] = { ...cells[i]!, ...patch };
    onUpdate({ cells });
  };

  return (
    <div className="space-y-3 p-1">
      {columns.map((col, i) => {
        const cell = draft.cells[i] ?? { id: newId(cellTag), text: "" };
        return (
          <div key={col.id} className="space-y-1">
            <Label className="text-xs font-medium">
              {col.label || `Column ${i + 1}`}
            </Label>
            <Input
              className="h-8 text-sm"
              value={cell.text}
              placeholder="Cell content"
              onChange={(e) => updateCell(i, { text: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Align</Label>
                <select
                  className="h-7 w-full rounded-md border bg-background px-1 text-xs"
                  value={cell.align ?? ""}
                  onChange={(e) =>
                    updateCell(i, {
                      align: (e.target.value as TableCellData["align"]) || undefined,
                    })
                  }
                >
                  <option value="">Default</option>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Colspan</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  min={1}
                  max={10}
                  value={cell.colspan ?? ""}
                  placeholder="1"
                  onChange={(e) =>
                    updateCell(i, {
                      colspan: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Rowspan</Label>
                <Input
                  type="number"
                  className="h-7 text-xs"
                  min={1}
                  max={10}
                  value={cell.rowspan ?? ""}
                  placeholder="1"
                  onChange={(e) =>
                    updateCell(i, {
                      rowspan: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mini grid preview ────────────────────────────────────────────────────────

function MiniGridPreview({
  columns,
  bodyRows,
  headerRow,
  footerRow,
}: {
  columns: ColumnDef[];
  bodyRows: TableRowData[];
  headerRow?: TableRowData;
  footerRow?: TableRowData;
}) {
  if (columns.length === 0) return null;

  const renderRow = (row: TableRowData, isHeader = false, isFooter = false) => (
    <tr
      key={row.id}
      className={
        isHeader
          ? "bg-muted/60 font-medium"
          : isFooter
          ? "bg-muted/40 font-medium"
          : ""
      }
    >
      {columns.map((col, i) => {
        const cell = row.cells[i];
        return (
          <td
            key={col.id}
            className="border px-1.5 py-0.5 text-[10px] max-w-[80px] truncate"
          >
            {cell?.text || (
              <span className="text-muted-foreground/50">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {headerRow && renderRow(headerRow, true)}
          {bodyRows.map((r) => renderRow(r))}
          {footerRow && renderRow(footerRow, false, true)}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function TableElementForm({ element, onChange }: Props) {
  const attrs = element.attributes ?? {};
  const colCount = getColCount(element);
  const tableData = useMemo(
    () => extractTableData(element, colCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element.id, JSON.stringify(element.children)]
  );

  const patch = useCallback(
    (updated: typeof tableData) => {
      const rebuilt = patchTableStructure(element, updated);
      onChange({ children: rebuilt.children });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element.id, onChange]
  );

  const updateAttrs = (attrPatch: Partial<HtmlElementAttributes>) => {
    onChange({ attributes: { ...attrs, ...attrPatch } });
  };

  // ── Columns ──────────────────────────────────────────────────────────────

  const handleColumnsChange = (newCols: ColumnDef[]) => {
    const cols = newCols;
    const colLen = cols.length;

    const resizeRow = (row: TableRowData): TableRowData => ({
      ...row,
      cells: Array.from({ length: colLen }, (_, i) => ({
        id: row.cells[i]?.id ?? newId("td"),
        text: row.cells[i]?.text ?? "",
        align: row.cells[i]?.align,
        colspan: row.cells[i]?.colspan,
        rowspan: row.cells[i]?.rowspan,
      })),
    });

    const headerRow = tableData.headerRow
      ? {
          ...tableData.headerRow,
          cells: Array.from({ length: colLen }, (_, i) => ({
            id: tableData.headerRow!.cells[i]?.id ?? newId("th"),
            text: cols[i]?.label ?? tableData.headerRow!.cells[i]?.text ?? "",
          })),
        }
      : undefined;

    patch({
      columns: cols,
      headerRow,
      bodyRows: tableData.bodyRows.map(resizeRow),
      footerRow: tableData.footerRow ? resizeRow(tableData.footerRow) : undefined,
    });
  };

  // ── Body rows ─────────────────────────────────────────────────────────────

  const handleBodyRowsChange = (newRows: TableRowData[]) => {
    patch({ ...tableData, bodyRows: newRows });
  };

  // ── Footer ────────────────────────────────────────────────────────────────

  const toggleFooter = (checked: boolean) => {
    if (checked) {
      const footerRow: TableRowData = {
        id: newId("tr"),
        cells: Array.from({ length: tableData.columns.length }, () => ({
          id: newId("td"),
          text: "",
        })),
      };
      patch({ ...tableData, footerRow });
    } else {
      patch({ ...tableData, footerRow: undefined });
    }
  };

  const handleFooterRowChange = (updatedRows: TableRowData[]) => {
    patch({ ...tableData, footerRow: updatedRows[0] });
  };

  return (
    <div className="space-y-4 p-3">
      {/* Table settings */}
      <div className="space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Table settings
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Width</Label>
            <select
              className="mt-1 h-7 w-full rounded-md border bg-background px-2 text-xs"
              value={attrs.tableWidth ?? "full"}
              onChange={(e) =>
                updateAttrs({ tableWidth: e.target.value as HtmlElementAttributes["tableWidth"] })
              }
            >
              <option value="full">Full width</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Layout</Label>
            <select
              className="mt-1 h-7 w-full rounded-md border bg-background px-2 text-xs"
              value={attrs.tableLayout ?? "auto"}
              onChange={(e) =>
                updateAttrs({ tableLayout: e.target.value as HtmlElementAttributes["tableLayout"] })
              }
            >
              <option value="auto">Auto</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={attrs.striped ?? false}
              onChange={(e) => updateAttrs({ striped: e.target.checked })}
            />
            Striped rows
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={attrs.bordered !== false}
              onChange={(e) => updateAttrs({ bordered: e.target.checked })}
            />
            Bordered
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={attrs.compact ?? false}
              onChange={(e) => updateAttrs({ compact: e.target.checked })}
            />
            Compact
          </label>
        </div>

        <div>
          <Label className="text-xs">Caption</Label>
          <Input
            className="mt-1 h-7 text-xs"
            value={attrs.caption ?? ""}
            placeholder="Optional table caption"
            onChange={(e) => updateAttrs({ caption: e.target.value || undefined })}
          />
        </div>
      </div>

      <hr />

      {/* Columns */}
      <ModalRepeatableListEditor<ColumnDef>
        items={tableData.columns}
        onChange={handleColumnsChange}
        strings={{
          sectionLabel: "Columns",
          addButtonLabel: "Add column",
          emptyLabel: "No columns defined.",
          dialogTitleCreate: "Add column",
          dialogTitleEdit: "Edit column",
          saveButtonLabelCreate: "Add",
          saveButtonLabelEdit: "Save",
        }}
        createEmpty={() => ({
          id: newId("col"),
          label: `Column ${tableData.columns.length + 1}`,
        })}
        renderSummary={(col) => ({
          title: col.label || "(Untitled column)",
          meta: [
            col.width ? `width: ${col.width}` : undefined,
            col.align ? `align: ${col.align}` : undefined,
          ].filter(Boolean) as string[],
        })}
        renderForm={(draft, onUpdate) => (
          <ColumnForm draft={draft} onUpdate={onUpdate} />
        )}
      />

      <hr />

      {/* Body rows */}
      <ModalRepeatableListEditor<TableRowData>
        items={tableData.bodyRows}
        onChange={handleBodyRowsChange}
        strings={{
          sectionLabel: `Rows (${tableData.bodyRows.length})`,
          addButtonLabel: "Add row",
          emptyLabel: "No rows. Add at least one row.",
          dialogTitleCreate: "Add row",
          dialogTitleEdit: "Edit row",
          saveButtonLabelCreate: "Add",
          saveButtonLabelEdit: "Save",
        }}
        createEmpty={() => ({
          id: newId("tr"),
          cells: tableData.columns.map(() => ({ id: newId("td"), text: "" })),
        })}
        renderSummary={(row, index) => ({
          title: `Row ${index + 1}`,
          meta: row.cells.slice(0, 3).map((c) => c.text).filter(Boolean),
        })}
        renderForm={(draft, onUpdate) => (
          <RowForm
            draft={draft}
            onUpdate={onUpdate}
            columns={tableData.columns}
            cellTag="td"
          />
        )}
      />

      {/* Footer */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            checked={Boolean(tableData.footerRow)}
            onChange={(e) => toggleFooter(e.target.checked)}
          />
          Include footer row
        </label>

        {tableData.footerRow && (
          <ModalRepeatableListEditor<TableRowData>
            items={[tableData.footerRow]}
            onChange={handleFooterRowChange}
            strings={{
              sectionLabel: "Footer",
              addButtonLabel: "Edit",
              emptyLabel: "",
              dialogTitleCreate: "Edit footer row",
              dialogTitleEdit: "Edit footer row",
              saveButtonLabelCreate: "Save",
              saveButtonLabelEdit: "Save",
            }}
            createEmpty={() => ({
              id: newId("tr"),
              cells: tableData.columns.map(() => ({ id: newId("td"), text: "" })),
            })}
            renderSummary={(row) => ({
              title: "Footer row",
              meta: row.cells.slice(0, 3).map((c) => c.text).filter(Boolean),
            })}
            renderForm={(draft, onUpdate) => (
              <RowForm
                draft={draft}
                onUpdate={onUpdate}
                columns={tableData.columns}
                cellTag="td"
              />
            )}
          />
        )}
      </div>

      <hr />

      {/* Mini grid preview */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Structure preview
        </p>
        <MiniGridPreview
          columns={tableData.columns}
          bodyRows={tableData.bodyRows}
          headerRow={tableData.headerRow}
          footerRow={tableData.footerRow}
        />
        <p className="text-[10px] text-muted-foreground">
          {tableData.columns.length} col{tableData.columns.length !== 1 ? "s" : ""} ·{" "}
          {tableData.bodyRows.length} row{tableData.bodyRows.length !== 1 ? "s" : ""}
          {tableData.headerRow ? " · header" : ""}
          {tableData.footerRow ? " · footer" : ""}
        </p>
      </div>
    </div>
  );
}
