import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

export type TextDir = "ltr" | "rtl";

/** Block types that can carry a `dir` attribute. */
export const TEXT_DIRECTION_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "bulletList",
  "orderedList",
] as const;

export function parseTextDir(value: string | null): TextDir | null {
  if (!value) return null;
  const dir = value.toLowerCase();
  return dir === "rtl" || dir === "ltr" ? dir : null;
}

export function textDirHtmlAttrs(dir: unknown): { dir: TextDir } | Record<string, never> {
  if (dir !== "rtl" && dir !== "ltr") return {};
  return { dir };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cbTextDirection: {
      setTextDirection: (dir: TextDir | null) => ReturnType;
    };
  }
}

/** Adds `dir` attribute support on blocks for RTL/LTR editing. */
export const TextDirection = Extension.create({
  name: "cbTextDirection",

  addGlobalAttributes() {
    return [
      {
        types: [...TEXT_DIRECTION_TYPES],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => parseTextDir(element.getAttribute("dir")),
            renderHTML: (attributes) => textDirHtmlAttrs(attributes.dir),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (dir) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          const typeNames = new Set<string>(TEXT_DIRECTION_TYPES);
          let found = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!typeNames.has(node.type.name)) return;
            found = true;
            if (node.attrs.dir === dir) return;
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
            }
          });

          if (dispatch && tr.docChanged) dispatch(tr);
          return found;
        },
    };
  },
});

export function getActiveTextDirection(editor: Editor): TextDir | null {
  for (const type of TEXT_DIRECTION_TYPES) {
    if (!editor.isActive(type)) continue;
    const dir = parseTextDir((editor.getAttributes(type).dir as string | null) ?? null);
    if (dir) return dir;
  }
  return null;
}

export function applyTextDirection(editor: Editor, dir: TextDir): void {
  editor.chain().focus().setTextDirection(dir).run();
}
