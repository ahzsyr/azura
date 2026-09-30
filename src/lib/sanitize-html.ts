import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code",
  "span", "strong", "em", "b", "i", "u", "mark", "small", "sup", "sub", "abbr", "kbd",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a",
  "img", "figure", "figcaption", "picture", "source", "video", "audio",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "div", "section", "article", "aside", "header", "footer", "main", "nav",
  "hr", "br",
];

const ALLOWED_ATTR = [
  "id", "class", "title", "lang", "dir", "style",
  "href", "target", "rel", "download",
  "src", "alt", "width", "height", "loading", "srcset", "sizes", "media", "type",
  "colspan", "rowspan", "scope", "headers",
  "aria-label", "aria-describedby", "aria-hidden", "aria-expanded",
  "role", "tabindex",
];

/** Presentation-only CSS that editors emit (text-align, colors, indent, table sizing). */
const ALLOWED_STYLE_PROPS = new Set([
  "text-align",
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "font-style",
  "font-family",
  "line-height",
  "letter-spacing",
  "text-decoration",
  "text-decoration-line",
  "text-decoration-color",
  "text-underline-offset",
  "width",
  "max-width",
  "min-width",
  "height",
  "max-height",
  "min-height",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "padding-inline",
  "padding-inline-start",
  "padding-inline-end",
  "padding-block",
  "padding-block-start",
  "padding-block-end",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "margin-inline",
  "margin-inline-start",
  "margin-inline-end",
  "margin-block",
  "vertical-align",
  "white-space",
  "word-break",
  "overflow-wrap",
  "opacity",
  "border",
  "border-width",
  "border-style",
  "border-color",
  "border-collapse",
  "border-radius",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "display",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "gap",
  "column-gap",
  "row-gap",
  "list-style-type",
]);

const UNSAFE_STYLE_VALUE =
  /url\s*\(|expression\s*\(|javascript:|behavior\s*:|-moz-binding|@import|attr\s*\(/i;

export function sanitizeInlineCss(style: string): string {
  const parts: string[] = [];
  for (const decl of style.split(";")) {
    const colon = decl.indexOf(":");
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim();
    if (!prop || !val) continue;
    if (prop.startsWith("-") || !ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (UNSAFE_STYLE_VALUE.test(val)) continue;
    parts.push(`${prop}: ${val}`);
  }
  return parts.join("; ");
}

let styleHookInstalled = false;

function ensureStyleHook() {
  if (styleHookInstalled) return;
  styleHookInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;
    const next = sanitizeInlineCss(String(data.attrValue ?? ""));
    if (!next) {
      data.keepAttr = false;
      data.attrValue = "";
      return;
    }
    data.attrValue = next;
  });
}

/** Sanitize untrusted/admin HTML for public rendering. Unsafe CSS in style is stripped. */
export function sanitizeHtml(input: string): string {
  if (!input?.trim()) return "";
  ensureStyleHook();
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "link", "meta"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}

/** @deprecated use sanitizeHtml */
export const sanitizeCustomHtml = sanitizeHtml;
