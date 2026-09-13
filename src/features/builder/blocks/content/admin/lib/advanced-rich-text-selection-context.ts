import type { Editor } from "@tiptap/react";

export type SelectionContext = "text" | "link" | "image" | "table" | "heading";

export function getSelectionContext(editor: Editor): SelectionContext {
  if (editor.isActive("image")) return "image";
  if (editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader")) return "table";
  if (editor.isActive("link")) return "link";
  if (editor.isActive("heading")) return "heading";
  return "text";
}
