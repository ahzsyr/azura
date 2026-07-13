/**
 * Sanitizes custom HTML content before rendering.
 * Extends the popup sanitizer allowlist with all tags supported by the custom HTML builder.
 */

const ALLOWED_TAGS = new Set([
  // Text
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code",
  // Inline
  "span", "strong", "em", "b", "i", "u", "mark", "small", "sup", "sub", "abbr", "kbd",
  // Lists
  "ul", "ol", "li", "dl", "dt", "dd",
  // Links
  "a",
  // Media
  "img", "figure", "figcaption", "picture", "source", "video", "audio",
  // Tables
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  // Layout
  "div", "section", "article", "aside", "header", "footer", "main", "nav",
  // Other
  "hr", "br",
]);

/** Strips full element including inner content for tags that must never appear */
const BLOCKED_FULL_ELEMENTS =
  /<(script|style|iframe|embed|object|template|noscript|svg|math)[\s\S]*?<\/\1>/gi;

/** Also strip any remaining orphan opening/closing tags of those blocked types */
const BLOCKED_TAGS =
  /<\/?(script|style|iframe|embed|object|form|input|textarea|select|link|meta|base|applet|frame|frameset|noframes|noscript|template|svg|math)[^>]*>/gi;

const ALLOWED_ATTRS = new Set([
  "id", "class", "style", "title", "lang", "dir",
  "href", "target", "rel", "download",
  "src", "alt", "width", "height", "loading", "srcset", "sizes", "media", "type",
  "colspan", "rowspan", "scope", "headers",
  "aria-label", "aria-describedby", "aria-hidden", "aria-expanded",
  "role", "tabindex",
]);

const DATA_ATTR_RE = /^data-[\w-]+$/;
const ARIA_ATTR_RE = /^aria-[\w-]+$/;

function stripDangerousAttributes(rawTag: string): string {
  // Remove event handlers
  let clean = rawTag.replace(/\s+on[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Remove javascript: in href/src
  clean = clean.replace(
    /\s+(href|src|action|formaction)\s*=\s*(?:"[^"]*javascript:[^"]*"|'[^']*javascript:[^']*'|javascript:[^\s>]+)/gi,
    ""
  );
  // Strip unknown attributes (allow known + data-*)
  clean = clean.replace(
    /\s+([\w:-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match: string, attrName: string) => {
      const lower = attrName.toLowerCase();
      if (ALLOWED_ATTRS.has(lower) || DATA_ATTR_RE.test(lower) || ARIA_ATTR_RE.test(lower)) return match;
      return "";
    }
  );
  return clean;
}

function sanitizeTag(tag: string): string {
  const match = /^<\/?\s*([a-z0-9-]+)/i.exec(tag);
  if (!match) return "";
  const name = match[1]!.toLowerCase();
  if (!ALLOWED_TAGS.has(name)) return "";
  return stripDangerousAttributes(tag);
}

export function sanitizeCustomHtml(input: string): string {
  if (!input.trim()) return "";
  // First, strip full blocked elements with their inner content
  const withoutFullBlocked = input.replace(BLOCKED_FULL_ELEMENTS, "");
  // Then strip any remaining orphan blocked tags
  const withoutOrphans = withoutFullBlocked.replace(BLOCKED_TAGS, "");
  // Finally, sanitize remaining tags' attributes
  return withoutOrphans.replace(/<\/?[^>]+>/g, (tag) => sanitizeTag(tag) || "");
}
