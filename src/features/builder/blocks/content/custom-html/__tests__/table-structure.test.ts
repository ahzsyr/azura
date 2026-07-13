import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTableElement,
  extractTableData,
  patchTableStructure,
} from "../lib/table-structure";

describe("createTableElement", () => {
  it("creates a basic table with header and body rows", () => {
    const el = createTableElement({ rows: 2, cols: 3, hasHeader: true, hasFooter: false });
    assert.equal(el.tag, "table");
    const thead = el.children?.find((c) => c.tag === "thead");
    const tbody = el.children?.find((c) => c.tag === "tbody");
    assert.ok(thead, "should have thead");
    assert.ok(tbody, "should have tbody");
    assert.equal(tbody!.children?.length, 2);
    assert.equal(tbody!.children![0]!.children?.length, 3);
    const headerRow = thead!.children![0]!;
    assert.equal(headerRow.children?.length, 3);
  });

  it("creates footer when hasFooter is true", () => {
    const el = createTableElement({ rows: 1, cols: 2, hasHeader: false, hasFooter: true });
    const tfoot = el.children?.find((c) => c.tag === "tfoot");
    assert.ok(tfoot, "should have tfoot");
    assert.equal(tfoot!.children?.[0]?.children?.length, 2);
  });

  it("gives each cell a stable unique id", () => {
    const el = createTableElement({ rows: 2, cols: 2, hasHeader: true, hasFooter: false });
    const allIds: string[] = [];
    function collect(node: typeof el) {
      allIds.push(node.id);
      for (const child of node.children ?? []) collect(child);
    }
    collect(el);
    const unique = new Set(allIds);
    assert.equal(unique.size, allIds.length, "all ids should be unique");
  });
});

describe("extractTableData", () => {
  it("extracts columns from header row", () => {
    const el = createTableElement({ rows: 1, cols: 2, hasHeader: true, hasFooter: false });
    const data = extractTableData(el, 2);
    assert.equal(data.columns.length, 2);
    assert.equal(data.bodyRows.length, 1);
    assert.ok(data.headerRow, "should have header row");
  });

  it("extracts body rows with cell text", () => {
    const el = createTableElement({ rows: 3, cols: 2, hasHeader: false, hasFooter: false });
    // Inject text into first body cell
    el.children![0]!.children![0]!.children![0]!.text = "Alice";
    const data = extractTableData(el, 2);
    assert.equal(data.bodyRows.length, 3);
    assert.equal(data.bodyRows[0]!.cells[0]!.text, "Alice");
  });
});

describe("patchTableStructure", () => {
  it("preserves table element id on patch", () => {
    const el = createTableElement({ rows: 1, cols: 2, hasHeader: true, hasFooter: false });
    const originalId = el.id;
    const data = extractTableData(el, 2);
    const patched = patchTableStructure(el, data);
    assert.equal(patched.id, originalId);
  });

  it("adds a new column while preserving existing body cell content", () => {
    const el = createTableElement({ rows: 1, cols: 2, hasHeader: false, hasFooter: false });
    let data = extractTableData(el, 2);

    // Set cell content
    data.bodyRows[0]!.cells[0]!.text = "Alice";
    data.bodyRows[0]!.cells[1]!.text = "Bob";

    // Add a new column
    data = {
      ...data,
      columns: [...data.columns, { id: "new-col", label: "New Col" }],
      bodyRows: data.bodyRows.map((row) => ({
        ...row,
        cells: [...row.cells, { id: "new-td", text: "New" }],
      })),
    };

    const patched = patchTableStructure(el, data);
    const bodyRow = patched.children?.find((c) => c.tag === "tbody")?.children?.[0];
    assert.equal(bodyRow?.children?.length, 3);
  });
});
