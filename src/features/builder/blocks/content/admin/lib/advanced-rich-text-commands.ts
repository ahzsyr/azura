import type { Editor } from "@tiptap/react";

export function clearFormatting(editor: Editor): void {
  editor.chain().focus().clearNodes().unsetAllMarks().run();
}

/**
 * Restore a previously captured selection, then execute a command chain.
 * Use this from toolbar popovers where clicking the menu button may blur
 * the editor and collapse the ProseMirror selection before the command runs.
 */
export function runWithRestoredSelection(
  editor: Editor,
  saved: { from: number; to: number } | null,
  fn: (editor: Editor) => void
): void {
  if (saved) {
    editor.chain().focus().setTextSelection(saved).run();
  } else {
    editor.commands.focus();
  }
  fn(editor);
}

export function findNext(
  editor: Editor,
  search: string,
  caseSensitive = false
): boolean {
  if (!search) return false;
  const { doc, selection } = editor.state;
  const needle = caseSensitive ? search : search.toLowerCase();
  let found: { from: number; to: number } | null = null;

  const scan = (from: number, to: number) => {
    doc.nodesBetween(from, to, (node, pos) => {
      if (found || !node.isText || !node.text) return;
      const hay = caseSensitive ? node.text : node.text.toLowerCase();
      const idx = hay.indexOf(needle);
      if (idx >= 0) {
        found = { from: pos + idx, to: pos + idx + search.length };
      }
    });
  };

  scan(selection.to, doc.content.size);
  if (!found) scan(0, selection.to);

  if (found) {
    editor.chain().focus().setTextSelection(found).run();
    return true;
  }
  return false;
}

export function replaceSelection(editor: Editor, replacement: string): boolean {
  const { empty, from, to } = editor.state.selection;
  if (empty) return false;
  editor.chain().focus().insertContentAt({ from, to }, replacement).run();
  return true;
}

export function replaceAll(editor: Editor, search: string, replacement: string): number {
  if (!search) return 0;
  let count = 0;
  const html = editor.getHTML();
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = html.replace(new RegExp(escaped, "g"), () => {
    count += 1;
    return replacement;
  });
  if (count > 0) editor.commands.setContent(next, { emitUpdate: true });
  return count;
}

export function setTextDirection(editor: Editor, dir: "ltr" | "rtl"): void {
  const type = editor.isActive("heading") ? "heading" : "paragraph";
  editor.chain().focus().updateAttributes(type, { dir }).run();
}
