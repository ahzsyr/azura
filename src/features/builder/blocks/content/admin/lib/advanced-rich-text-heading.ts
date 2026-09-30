import Heading from "@tiptap/extension-heading";

export const HeadingWithAnchor = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
    };
  },
});

export function setHeadingAnchor(editor: import("@tiptap/react").Editor, id: string): boolean {
  for (const level of [1, 2, 3, 4] as const) {
    if (editor.isActive("heading", { level })) {
      return editor.chain().focus().updateAttributes("heading", { id: id || null }).run();
    }
  }
  return false;
}

export function getHeadingAnchor(editor: import("@tiptap/react").Editor): string {
  return (editor.getAttributes("heading").id as string) || "";
}
