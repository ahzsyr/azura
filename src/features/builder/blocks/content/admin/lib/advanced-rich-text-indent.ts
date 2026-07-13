import { Extension } from "@tiptap/core";

export const INDENT_STEP_REM = 2;
export const MAX_INDENT = 7;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

export const IndentExtension = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Number(el.getAttribute("data-indent") ?? 0),
            renderHTML: (attrs) => {
              if (!attrs.indent) return {};
              return {
                "data-indent": attrs.indent,
                style: `padding-inline-start: ${(attrs.indent as number) * INDENT_STEP_REM}rem`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
        ({ editor, commands }) => {
          if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
            return commands.sinkListItem("listItem");
          }
          const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
          const current = (editor.getAttributes(nodeType).indent as number) ?? 0;
          return commands.updateAttributes(nodeType, {
            indent: Math.min(MAX_INDENT, current + 1),
          });
        },

      decreaseIndent:
        () =>
        ({ editor, commands }) => {
          if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
            return commands.liftListItem("listItem");
          }
          const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
          const current = (editor.getAttributes(nodeType).indent as number) ?? 0;
          return commands.updateAttributes(nodeType, {
            indent: Math.max(0, current - 1),
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.increaseIndent(),
      "Shift-Tab": () => this.editor.commands.decreaseIndent(),
    };
  },
});
