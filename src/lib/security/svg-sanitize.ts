/**
 * Minimal, dependency-free SVG sanitizer for uploads.
 *
 * Goal: an SVG served from /uploads can never execute script when a victim
 * opens it directly (uploads are same-origin, so script there inherits the
 * site origin). This is defense-in-depth — the upload route also forces a
 * download for non-icon SVGs — and applies to <img> rendering so that inline
 * script/event handlers cannot run even if the attachment rule is bypassed.
 *
 * Policy (deny by default):
 * - Remove <script>, <foreignObject>, <iframe>, <embed>, <object>, <link>,
 *   <meta>, <use href="external">
 * - Remove every on* event handler attribute
 * - Remove javascript:/data:(non-image)/vbscript: URLs from href/xlink:href
 * - Remove external references (http/https/protocol-relative) from
 *   href/xlink:href/src/image/font/style @import/url()
 * - Remove <style> blocks containing @import or url() pointing outside data:
 *
 * What it does NOT do: parse XML. A regex-based sanitizer is not a full XML
 * parser; the attachment rule on the serving side is the primary control.
 */

const FORBIDDEN_ELEMENTS = [
  "script",
  "foreignobject",
  "iframe",
  "embed",
  "object",
  "link",
  "meta",
  "base",
];

const SAFE_DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

function isExternalRef(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("#")) return false;
  if (SAFE_DATA_URL.test(v)) return false;
  if (/^(javascript|vbscript|livescript|file|blob):/i.test(v)) return true;
  if (/^data:/i.test(v)) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return true; // http:, https:, ftp:, etc.
  if (v.startsWith("//")) return true; // protocol-relative
  return false;
}

function stripForbiddenElements(svg: string): string {
  let out = svg;
  for (const tag of FORBIDDEN_ELEMENTS) {
    // Paired elements, including nested-looking content.
    out = out.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    // Self-closing or unclosed.
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }
  return out;
}

function stripEventHandlers(svg: string): string {
  // on*="…"; on*='…'; on*=bare
  return svg
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
}

function stripUnsafeUrls(svg: string): string {
  // href / xlink:href / src attribute values.
  return svg.replace(
    /\b(href|xlink:href|src|action|formaction)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (match, _attr: string, _all: string, dq?: string, sq?: string, bare?: string) => {
      const value = dq ?? sq ?? bare ?? "";
      return isExternalRef(value) ? "" : match;
    },
  );
}

function stripCssUrlRefs(css: string): string {
  // url( ... ) referencing anything outside data:image/.
  return css.replace(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi, (match, _q: string, url: string) => {
    return isExternalRef(url) ? "" : match;
  });
}

function hardenStyleBlocks(svg: string): string {
  return svg
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi, (_m, attrs: string, css: string) => {
      const cleaned = stripCssUrlRefs(css).replace(/@import\s+[^;]+;?/gi, "");
      return `<style${attrs}>${cleaned}</style>`;
    })
    .replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (match, _all: string, dq?: string, sq?: string) => {
      const css = dq ?? sq ?? "";
      const cleaned = stripCssUrlRefs(css).replace(/@import\s+[^;]+;?/gi, "");
      return ` style="${cleaned.replace(/"/g, "&quot;")}"`;
    });
}

function ensureSvgRoot(svg: string): string {
  // A DOCTYPE can carry entity definitions; drop it. Keep XML prolog harmless.
  return svg.replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, "");
}

/** Returns sanitized SVG markup. Never throws. */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string" || !svg.trim()) return "";
  let out = svg;
  out = ensureSvgRoot(out);
  out = stripForbiddenElements(out);
  out = stripEventHandlers(out);
  out = stripUnsafeUrls(out);
  out = hardenStyleBlocks(out);
  return out;
}

/** Detects whether an SVG string still contains a script-capable construct. */
export function containsActiveSvgContent(svg: string): boolean {
  if (!svg) return false;
  if (/<\s*script\b/i.test(svg)) return true;
  if (/\son[a-z]+\s*=/i.test(svg)) return true;
  if (/<\s*(foreignObject|iframe|embed|object)\b/i.test(svg)) return true;
  if (/\b(href|xlink:href)\s*=\s*("|')\s*(javascript|data|https?:|\/\/)/i.test(svg)) {
    return true;
  }
  return false;
}

/** UTF-8 BOM-tolerant SVG sniff for magic-byte validation. */
export function looksLikeSvg(buffer: Uint8Array): boolean {
  let start = 0;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) start = 3;
  const head = Buffer.from(buffer.subarray(start, Math.min(buffer.length, start + 2048)))
    .toString("utf8")
    .trimStart()
    .toLowerCase()
    .replace(/^<\?xml[^>]*\?>\s*/, "")
    .replace(/^<!--[\s\S]*?-->\s*/, "");
  return head.startsWith("<svg");
}
