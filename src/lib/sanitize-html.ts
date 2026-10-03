import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code",
  "span", "strong", "em", "b", "i", "u", "mark", "small", "sup", "sub", "abbr", "kbd",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a",
  "img", "figure", "figcaption", "picture", "source", "video", "audio",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  // No document landmarks: marketing layout already owns <main>/<header>/<footer>/<nav>.
  // Nested landmarks are repaired by the browser and trigger React #418 on hydrate.
  "div", "section", "article", "aside",
  "hr", "br",
];

/** Rewrite nested document landmarks to <div> before purify (keeps content, avoids nest repair). */
export function demoteDocumentLandmarks(input: string): string {
  return input.replace(
    /<\/?(?:main|header|footer|nav)(\s[^>]*)?>/gi,
    (tag) => tag.replace(/^(<\/?)(?:main|header|footer|nav)/i, "$1div"),
  );
}

/** Strip script/style/iframe shells — string-only, identical on Node and in the browser. */
export function stripForbiddenHtmlShells(input: string): string {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|form|input|link|meta)\b[^>]*>/gi, "");
}

/**
 * Structural HTML cleanup that never imports DOMPurify/jsdom.
 * Use from client islands so SSR and the first client paint emit identical markup (#418).
 */
export function sanitizeHtmlStructural(input: string): string {
  if (!input?.trim()) return "";
  return hoistInvalidParagraphBlocks(
    unwrapNestedAnchors(demoteDocumentLandmarks(stripForbiddenHtmlShells(input))),
  );
}

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

/** Block tags that must not be children of <p> (browser auto-closes the paragraph). */
const P_FORBIDDEN_CHILD_TAGS = new Set([
  "div",
  "section",
  "article",
  "aside",
  "ul",
  "ol",
  "table",
  "figure",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

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

function warnNestedAnchor(snippet: string) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    "[sanitizeHtml] nested <a> unwrapped to <span> (outer link wins):",
    snippet.slice(0, 160),
  );
}

/**
 * Outer <a> wins: demote nested anchors to <span> (preserve text/children).
 * String pre-pass — must run before DOMPurify/jsdom, which auto-repair a>a into siblings.
 * Emits a DEV warning when any demotion occurs.
 */
export function unwrapNestedAnchors(html: string): string {
  if (!html || !/<a[\s>]/i.test(html)) return html;

  let result = "";
  let i = 0;
  let depth = 0;
  let warned = false;

  while (i < html.length) {
    const rest = html.slice(i);
    const openMatch = rest.match(/^<a(\s[^>]*)?>/i);
    if (openMatch) {
      if (depth === 0) {
        result += openMatch[0];
      } else {
        if (!warned) {
          warnNestedAnchor(rest.slice(0, 120));
          warned = true;
        }
        const attrs = openMatch[1] ?? "";
        const safeAttrs = attrs.replace(
          /\s*(href|target|rel|download)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
          "",
        );
        result += `<span${safeAttrs}>`;
      }
      depth += 1;
      i += openMatch[0].length;
      continue;
    }

    const closeMatch = rest.match(/^<\/a>/i);
    if (closeMatch) {
      result += depth <= 1 ? "</a>" : "</span>";
      depth = Math.max(0, depth - 1);
      i += closeMatch[0].length;
      continue;
    }

    result += html[i]!;
    i += 1;
  }

  return result;
}

const P_BLOCK_TAG_RE = new RegExp(
  `<(${[...P_FORBIDDEN_CHILD_TAGS].join("|")})(\\s[^>]*)?>`,
  "i",
);

/** Find the end index (after closing tag) of a matched open element; -1 if unclosed. */
function findMatchingClose(html: string, openStart: number, openTag: string, tagName: string): number {
  const openLen = openTag.length;
  let depth = 1;
  let i = openStart + openLen;
  const openRe = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "gi");
  const closeRe = new RegExp(`</${tagName}>`, "gi");

  while (i < html.length && depth > 0) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);
    if (!nextClose) return -1;

    const openIdx = nextOpen?.index ?? Number.POSITIVE_INFINITY;
    const closeIdx = nextClose.index;

    if (openIdx < closeIdx) {
      depth += 1;
      i = openIdx + nextOpen![0].length;
    } else {
      depth -= 1;
      i = closeIdx + nextClose[0].length;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Hoist block children out of <p>. Does not rewrite valid sibling markup
 * like `<p>…</p><ul>…</ul>`.
 *
 * Pure string transform — never imports jsdom (that breaks Next client bundles via `net`/`tls`).
 */
export function hoistInvalidParagraphBlocks(html: string): string {
  if (!html || !/<p[\s>]/i.test(html)) return html;
  if (!P_BLOCK_TAG_RE.test(html)) return html;

  // Reset sticky regex state from the probe above.
  P_BLOCK_TAG_RE.lastIndex = 0;

  let out = "";
  let cursor = 0;

  while (cursor < html.length) {
    const slice = html.slice(cursor);
    const pOpen = slice.match(/^<p(\s[^>]*)?>/i);
    if (!pOpen) {
      // Copy until next <p or end.
      const nextP = slice.search(/<p[\s>]/i);
      if (nextP < 0) {
        out += slice;
        break;
      }
      out += slice.slice(0, nextP);
      cursor += nextP;
      continue;
    }

    const pOpenFull = pOpen[0];
    const pAttrs = pOpen[1] ?? "";
    const innerStart = cursor + pOpenFull.length;
    const closeMatch = html.slice(innerStart).match(/<\/p>/i);
    if (!closeMatch || closeMatch.index === undefined) {
      out += pOpenFull;
      cursor = innerStart;
      continue;
    }

    const innerEnd = innerStart + closeMatch.index;
    const inner = html.slice(innerStart, innerEnd);
    const afterP = innerEnd + closeMatch[0].length;

    // No forbidden block open inside this paragraph → leave as-is.
    P_BLOCK_TAG_RE.lastIndex = 0;
    if (!P_BLOCK_TAG_RE.test(inner)) {
      out += html.slice(cursor, afterP);
      cursor = afterP;
      continue;
    }
    P_BLOCK_TAG_RE.lastIndex = 0;

    let remaining = inner;
    let assembled = "";
    while (remaining.length > 0) {
      const blockMatch = remaining.match(P_BLOCK_TAG_RE);
      if (!blockMatch || blockMatch.index === undefined) {
        if (remaining.length > 0) {
          assembled += `<p${pAttrs}>${remaining}</p>`;
        }
        break;
      }

      const before = remaining.slice(0, blockMatch.index);
      if (before.length > 0) {
        assembled += `<p${pAttrs}>${before}</p>`;
      }

      const tagName = blockMatch[1]!.toLowerCase();
      const openTag = blockMatch[0];
      const blockEnd = findMatchingClose(remaining, blockMatch.index, openTag, tagName);
      if (blockEnd < 0) {
        // Unclosed block — emit rest and stop.
        assembled += remaining.slice(blockMatch.index);
        break;
      }

      assembled += remaining.slice(blockMatch.index, blockEnd);
      remaining = remaining.slice(blockEnd);
    }

    // Drop empty leading/trailing paragraphs created by pure whitespace.
    assembled = assembled.replace(/<p(\s[^>]*)?>\s*<\/p>/gi, "");
    out += assembled;
    cursor = afterP;
  }

  return out;
}

/** Sanitize untrusted/admin HTML for public rendering. Unsafe CSS in style is stripped. */
export function sanitizeHtml(input: string): string {
  if (!input?.trim()) return "";
  ensureStyleHook();
  // Nested <a> must be demoted before DOMPurify/jsdom parse (they flatten a>a into siblings).
  const withSafeAnchors = unwrapNestedAnchors(demoteDocumentLandmarks(input));
  const purified = DOMPurify.sanitize(withSafeAnchors, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "link",
      "meta",
      "main",
      "header",
      "footer",
      "nav",
    ],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
  // Post-pass: hoist illegal block children out of <p> (browser would otherwise rewrite the tree).
  return hoistInvalidParagraphBlocks(purified);
}

/** @deprecated use sanitizeHtml */
export const sanitizeCustomHtml = sanitizeHtml;
