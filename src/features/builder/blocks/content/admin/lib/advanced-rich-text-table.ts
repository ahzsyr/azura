import { Table } from "@tiptap/extension-table";

export const TableWithWidth = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => element.style.width || "100%",
        renderHTML: (attributes) => {
          const width = (attributes.width as string) || "100%";
          return { style: `width: ${width}` };
        },
      },
    };
  },
});
