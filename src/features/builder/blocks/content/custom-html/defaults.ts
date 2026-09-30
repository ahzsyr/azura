import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { HtmlElement, HtmlElementTag } from "./types";

export type ElementInsertPreset = "default" | "listWithHeader" | "tableWizard";

export type ElementMenuItem = {
  key: string;
  tag: HtmlElementTag;
  label: string;
  preset?: ElementInsertPreset;
};

function createListWithHeaderItem() {
  const title = "";
  const body = "";
  return {
    id: newId("li"),
    tag: "li" as const,
    title,
    text: body,
    children: [
      { id: newId("strong"), tag: "strong" as const, text: title },
      { id: newId("p"), tag: "p" as const, text: body },
    ],
  };
}

export function createDefaultElement(
  tag: HtmlElementTag,
  preset: ElementInsertPreset = "default"
): HtmlElement {
  const id = newId("chi");

  switch (tag) {
    case "p":
      return { id, tag, text: "" };

    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return { id, tag, text: "", attributes: { id: "" } };

    case "blockquote":
    case "pre":
      return { id, tag, text: "" };

    case "hr":
    case "br":
      return { id, tag };

    case "img":
      return {
        id,
        tag,
        attributes: { src: "", alt: "", loading: "lazy" },
      };

    case "figure":
      return {
        id,
        tag,
        attributes: { src: "", alt: "", loading: "lazy" },
        text: "", // figcaption
      };

    case "picture":
      return {
        id,
        tag,
        attributes: { src: "", alt: "", loading: "lazy", sources: [] },
      };

    case "a":
      return {
        id,
        tag,
        text: "",
        attributes: { href: "", target: "", rel: "" },
      };

    case "ul":
    case "ol":
      if (preset === "listWithHeader") {
        return {
          id,
          tag,
          attributes: { listVariant: "withHeader" },
          children: [createListWithHeaderItem()],
        };
      }
      return {
        id,
        tag,
        children: [{ id: newId("li"), tag: "li", text: "" }],
      };

    case "li":
      return { id, tag, text: "" };

    case "table":
      return {
        id,
        tag,
        children: [
          {
            id: newId("thead"),
            tag: "thead",
            children: [
              {
                id: newId("tr"),
                tag: "tr",
                children: [
                  { id: newId("th"), tag: "th", text: "Column 1" },
                  { id: newId("th"), tag: "th", text: "Column 2" },
                ],
              },
            ],
          },
          {
            id: newId("tbody"),
            tag: "tbody",
            children: [
              {
                id: newId("tr"),
                tag: "tr",
                children: [
                  { id: newId("td"), tag: "td", text: "" },
                  { id: newId("td"), tag: "td", text: "" },
                ],
              },
            ],
          },
        ],
      };

    case "div":
    case "section":
    case "article":
    case "aside":
    case "header":
    case "footer":
    case "main":
    case "nav":
      return { id, tag, children: [] };

    case "span":
    case "strong":
    case "em":
    case "b":
    case "i":
    case "u":
    case "mark":
    case "small":
    case "sup":
    case "sub":
    case "abbr":
    case "kbd":
    case "code":
      return { id, tag, text: "" };

    default:
      return { id, tag, text: "" };
  }
}

export const ELEMENT_MENU_GROUPS: Array<{
  label: string;
  items: ElementMenuItem[];
}> = [
  {
    label: "Text",
    items: [
      { key: "p", tag: "p", label: "Paragraph" },
      { key: "h1", tag: "h1", label: "Heading 1" },
      { key: "h2", tag: "h2", label: "Heading 2" },
      { key: "h3", tag: "h3", label: "Heading 3" },
      { key: "h4", tag: "h4", label: "Heading 4" },
      { key: "h5", tag: "h5", label: "Heading 5" },
      { key: "h6", tag: "h6", label: "Heading 6" },
      { key: "blockquote", tag: "blockquote", label: "Blockquote" },
      { key: "pre", tag: "pre", label: "Preformatted" },
    ],
  },
  {
    label: "Lists",
    items: [
      { key: "ul", tag: "ul", label: "Unordered List" },
      { key: "ol", tag: "ol", label: "Ordered List" },
      { key: "ul-with-header", tag: "ul", label: "List with Header", preset: "listWithHeader" },
    ],
  },
  {
    label: "Media",
    items: [
      { key: "img", tag: "img", label: "Image" },
      { key: "figure", tag: "figure", label: "Figure (Image + Caption)" },
      { key: "picture", tag: "picture", label: "Responsive Image" },
    ],
  },
  {
    label: "Links",
    items: [{ key: "a", tag: "a", label: "Link" }],
  },
  {
    label: "Layout",
    items: [
      { key: "div", tag: "div", label: "Div" },
      { key: "section", tag: "section", label: "Section" },
      { key: "article", tag: "article", label: "Article" },
      { key: "aside", tag: "aside", label: "Aside" },
      { key: "header", tag: "header", label: "Header" },
      { key: "footer", tag: "footer", label: "Footer" },
      { key: "main", tag: "main", label: "Main" },
      { key: "nav", tag: "nav", label: "Nav" },
    ],
  },
  {
    label: "Tables",
    items: [{ key: "table", tag: "table", label: "Table", preset: "tableWizard" }],
  },
  {
    label: "Inline",
    items: [
      { key: "span", tag: "span", label: "Span" },
      { key: "strong", tag: "strong", label: "Strong" },
      { key: "em", tag: "em", label: "Italic (em)" },
      { key: "b", tag: "b", label: "Bold" },
      { key: "i", tag: "i", label: "Italic (i)" },
      { key: "u", tag: "u", label: "Underline" },
      { key: "mark", tag: "mark", label: "Mark" },
      { key: "small", tag: "small", label: "Small" },
      { key: "code", tag: "code", label: "Code" },
      { key: "sup", tag: "sup", label: "Superscript" },
      { key: "sub", tag: "sub", label: "Subscript" },
    ],
  },
  {
    label: "Other",
    items: [
      { key: "hr", tag: "hr", label: "Horizontal Rule" },
      { key: "br", tag: "br", label: "Line Break" },
    ],
  },
];

export const TAG_LABELS: Partial<Record<HtmlElementTag, string>> = Object.fromEntries(
  ELEMENT_MENU_GROUPS.flatMap((g) =>
    g.items
      .filter((i) => !i.preset)
      .map((i) => [i.tag, i.label])
  )
) as Partial<Record<HtmlElementTag, string>>;
