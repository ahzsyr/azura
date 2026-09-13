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
  "id", "class", "title", "lang", "dir",
  "href", "target", "rel", "download",
  "src", "alt", "width", "height", "loading", "srcset", "sizes", "media", "type",
  "colspan", "rowspan", "scope", "headers",
  "aria-label", "aria-describedby", "aria-hidden", "aria-expanded",
  "role", "tabindex",
];

/** Sanitize untrusted/admin HTML for public rendering. Style attributes stripped. */
export function sanitizeHtml(input: string): string {
  if (!input?.trim()) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "link", "meta"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}

/** @deprecated use sanitizeHtml */
export const sanitizeCustomHtml = sanitizeHtml;
