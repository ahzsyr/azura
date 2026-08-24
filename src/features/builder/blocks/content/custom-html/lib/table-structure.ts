import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { HtmlElement, HtmlElementAttributes } from "../types";
import { copyPrefixedFields } from "./localized-fields";

export type TableConfig = {
  rows: number;
  cols: number;
  hasHeader: boolean;
  hasFooter: boolean;
  /** Column definitions (label, width, align) — order determines column position */
  columns?: ColumnDef[];
};

export type ColumnDef = {
  id: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  /** Locale variants: labelEn, labelAr, etc. */
  [key: string]: string | undefined;
};

export type TableCellData = {
  /** Stable cell id so accordion doesn't collapse */
  id: string;
  text: string;
  colspan?: number;
  rowspan?: number;
  align?: "left" | "center" | "right";
  width?: string;
  /** Locale variants: textEn, textAr, etc. */
  [key: string]: string | number | undefined;
};

export type TableRowData = {
  id: string;
  cells: TableCellData[];
};

export type TableData = {
  headerRow?: TableRowData;
  bodyRows: TableRowData[];
  footerRow?: TableRowData;
  columns: ColumnDef[];
};

const CELL_STRUCTURAL_KEYS = new Set(["id", "text", "colspan", "rowspan", "align", "width"]);

export function pickCellLocaleFields(cell: TableCellData | undefined): Record<string, string> {
  if (!cell) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cell)) {
    if (CELL_STRUCTURAL_KEYS.has(k)) continue;
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// ─── Extraction ─────────────────────────────────────────────────────────────

function extractRowData(tr: HtmlElement): TableRowData {
  const cells: TableCellData[] = (tr.children ?? []).map((cell) => ({
    id: cell.id,
    text: cell.text ?? "",
    ...copyPrefixedFields(cell as Record<string, unknown>, "text", "text"),
    colspan: cell.attributes?.colspan,
    rowspan: cell.attributes?.rowspan,
    align: cell.attributes?.cellAlign,
    width: cell.attributes?.cellWidth,
  }));
  return { id: tr.id, cells };
}

function findSection(table: HtmlElement, sectionTag: "thead" | "tbody" | "tfoot"): HtmlElement | undefined {
  return (table.children ?? []).find((c) => c.tag === sectionTag);
}

/** Extract structured data from an existing table HtmlElement. */
export function extractTableData(table: HtmlElement, cols: number): TableData {
  const thead = findSection(table, "thead");
  const tbody = findSection(table, "tbody");
  const tfoot = findSection(table, "tfoot");

  const headerTr = thead?.children?.[0];
  const footerTr = tfoot?.children?.[0];
  const bodyTrs = tbody?.children ?? [];

  // Derive column definitions from th cells in header row or fallback empty
  const columns: ColumnDef[] = Array.from({ length: cols }, (_, i) => {
    const existingTh = headerTr?.children?.[i];
    return {
      id: existingTh?.id ?? newId("col"),
      label: existingTh?.text ?? `Column ${i + 1}`,
      ...copyPrefixedFields(existingTh as Record<string, unknown> | undefined, "text", "label"),
      width: existingTh?.attributes?.cellWidth,
      align: existingTh?.attributes?.cellAlign,
    };
  });

  return {
    headerRow: headerTr ? extractRowData(headerTr) : undefined,
    bodyRows: bodyTrs.map(extractRowData),
    footerRow: footerTr ? extractRowData(footerTr) : undefined,
    columns,
  };
}

// ─── Building ────────────────────────────────────────────────────────────────

function buildCell(
  tag: "th" | "td",
  data: TableCellData,
  col?: ColumnDef
): HtmlElement {
  const cellAttrs: HtmlElementAttributes = {};
  const align = data.align ?? col?.align;
  const width = data.width ?? col?.width;
  if (align) cellAttrs.cellAlign = align;
  if (width) cellAttrs.cellWidth = width;
  if (typeof data.colspan === "number" && data.colspan > 1) cellAttrs.colspan = data.colspan;
  if (typeof data.rowspan === "number" && data.rowspan > 1) cellAttrs.rowspan = data.rowspan;

  return {
    id: data.id,
    tag,
    text: data.text,
    ...copyPrefixedFields(data as Record<string, unknown>, "text", "text"),
    ...(Object.keys(cellAttrs).length ? { attributes: cellAttrs } : {}),
  };
}

function buildRow(
  trId: string,
  cellTag: "th" | "td",
  cells: TableCellData[],
  cols: number,
  colDefs: ColumnDef[]
): HtmlElement {
  const children: HtmlElement[] = Array.from({ length: cols }, (_, i) => {
    const cell = cells[i] ?? { id: newId(cellTag), text: "" };
    return buildCell(cellTag, cell, colDefs[i]);
  });
  return { id: trId, tag: "tr", children };
}

/**
 * Build a fresh table HtmlElement from a TableData descriptor.
 * Uses stable ids from TableData where available.
 */
export function buildTableFromData(
  tableId: string,
  data: TableData,
  tableAttrs?: HtmlElementAttributes
): HtmlElement {
  const cols = data.columns.length;
  const children: HtmlElement[] = [];

  if (data.headerRow) {
    const headerCells: TableCellData[] = Array.from({ length: cols }, (_, i) => {
      const existing = data.headerRow!.cells[i];
      const col = data.columns[i];
      const fromCol = copyPrefixedFields(col as Record<string, unknown> | undefined, "label", "text");
      return {
        id: existing?.id ?? newId("th"),
        text: col?.label ?? existing?.text ?? "",
        ...copyPrefixedFields(existing as Record<string, unknown> | undefined, "text", "text"),
        ...fromCol,
        align: existing?.align,
        width: existing?.width,
        colspan: existing?.colspan,
        rowspan: existing?.rowspan,
      };
    });
    const tr = buildRow(data.headerRow.id, "th", headerCells, cols, data.columns);
    children.push({ id: newId("thead"), tag: "thead", children: [tr] });
  }

  const bodyTrs = data.bodyRows.map((row) =>
    buildRow(row.id, "td", row.cells, cols, data.columns)
  );
  children.push({ id: newId("tbody"), tag: "tbody", children: bodyTrs });

  if (data.footerRow) {
    const tr = buildRow(data.footerRow.id, "td", data.footerRow.cells, cols, data.columns);
    children.push({ id: newId("tfoot"), tag: "tfoot", children: [tr] });
  }

  return {
    id: tableId,
    tag: "table",
    attributes: tableAttrs,
    children,
  };
}

/** Create a fresh table HtmlElement from a wizard config. */
export function createTableElement(
  config: TableConfig,
  tableAttrs?: HtmlElementAttributes
): HtmlElement {
  const tableId = newId("table");
  const { rows, cols, hasHeader, hasFooter, columns: colDefs } = config;

  const columns: ColumnDef[] = colDefs?.length
    ? colDefs
    : Array.from({ length: cols }, (_, i) => ({
        id: newId("col"),
        label: `Column ${i + 1}`,
      }));

  const makeEmptyRow = (): TableRowData => ({
    id: newId("tr"),
    cells: Array.from({ length: cols }, () => ({ id: newId("td"), text: "" })),
  });

  const data: TableData = {
    headerRow: hasHeader
      ? {
          id: newId("tr"),
          cells: columns.map((c) => ({
            id: newId("th"),
            ...copyPrefixedFields(c as Record<string, unknown>, "label", "text"),
            text: c.label,
          })),
        }
      : undefined,
    bodyRows: Array.from({ length: rows }, makeEmptyRow),
    footerRow: hasFooter ? makeEmptyRow() : undefined,
    columns,
  };

  return buildTableFromData(tableId, data, tableAttrs);
}

/**
 * Patch an existing table element by updating its structure while preserving
 * existing cell/row ids where possible.
 */
export function patchTableStructure(
  existing: HtmlElement,
  data: TableData
): HtmlElement {
  return buildTableFromData(existing.id, data, existing.attributes);
}
