import { Node, mergeAttributes } from "@tiptap/core";

export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-callout=""]' }, { tag: "div[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-callout": "", class: "cb-callout" }), 0];
  },
});

export const ButtonNode = Node.create({
  name: "cbButton",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: 'a[data-cb-button=""]' }, { tag: "a[data-cb-button]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-cb-button": "",
        class: "cb-button inline-block",
        href: "#",
      }),
      "Button",
    ];
  },
  addAttributes() {
    return {
      href: { default: "#" },
      label: { default: "Button" },
    };
  },
});

export const ColumnsNode = Node.create({
  name: "cbColumns",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      cols: { default: "2" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-cb-columns]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const cols = HTMLAttributes.cols ?? "2";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-cb-columns": cols,
        class: `cb-columns cb-columns--${cols}`,
      }),
      0,
    ];
  },
});
