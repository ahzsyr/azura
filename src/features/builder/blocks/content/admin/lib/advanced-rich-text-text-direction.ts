import { Extension } from "@tiptap/core";

/** Adds `dir` attribute support on paragraphs and headings for RTL/LTR editing. */
export const TextDirection = Extension.create({
  name: "cbTextDirection",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.getAttribute("dir"),
            renderHTML: (attributes) => {
              if (!attributes.dir) return {};
              return { dir: attributes.dir };
            },
          },
        },
      },
    ];
  },
});

export function applyTextDirection(editor: import("@tiptap/react").Editor, dir: "ltr" | "rtl"): void {
  const type = editor.isActive("heading") ? "heading" : "paragraph";
  editor.chain().focus().updateAttributes(type, { dir }).run();
}
