import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FORMAT_OPTIONS,
  applyFormat,
  getActiveFormat,
} from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar-groups";

function mockEditor(active: { headingLevel?: 1 | 2 | 3 | 4 } = {}) {
  const calls: string[] = [];
  const editor = {
    calls,
    isActive(name: string, attrs?: { level?: number }) {
      if (name !== "heading") return false;
      return active.headingLevel != null && (attrs?.level == null || attrs.level === active.headingLevel);
    },
    chain() {
      const run = (label: string) => ({ run: () => {
        calls.push(label);
        return true;
      } });
      return {
        focus() {
          return {
            setParagraph: () => run("paragraph"),
            setHeading: (attrs: { level: number }) => run(`heading:${attrs.level}`),
            toggleHeading: (attrs: { level: number }) => run(`toggle:${attrs.level}`),
          };
        },
      };
    },
  };
  return editor;
}

describe("advanced rich text paragraph/heading format", () => {
  it("lists paragraph and heading levels 1–4", () => {
    assert.deepEqual(
      FORMAT_OPTIONS.map((option) => option.value),
      ["paragraph", "1", "2", "3", "4"],
    );
  });

  it("reports the active heading level", () => {
    assert.equal(getActiveFormat(mockEditor({ headingLevel: 2 }) as never), "2");
    assert.equal(getActiveFormat(mockEditor() as never), "paragraph");
  });

  it("sets a heading instead of toggling, and ignores invalid levels", () => {
    const editor = mockEditor();
    applyFormat(editor as never, "paragraph");
    applyFormat(editor as never, "1");
    applyFormat(editor as never, "4");
    applyFormat(editor as never, "9");
    applyFormat(editor as never, "heading");
    assert.deepEqual(editor.calls, ["paragraph", "heading:1", "heading:4"]);
  });
});
