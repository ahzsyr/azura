const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "div",
  "blockquote",
  "code",
  "pre",
  "img",
]);

const GLOBAL_STRIP = /<\/?(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta)[^>]*>/gi;

function stripDangerousAttributes(tag: string): string {
  return tag
    .replace(/\s(on\w+|style|formaction|xmlns|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, "");
}

function sanitizeTagName(tag: string): string {
  const match = /^<\/?\s*([a-z0-9-]+)/i.exec(tag);
  if (!match) return "";
  const name = match[1].toLowerCase();
  if (!ALLOWED_TAGS.has(name)) return "";
  return stripDangerousAttributes(tag);
}

/** Allowlist-based HTML sanitizer for popup content (no script/style). */
export function sanitizePopupHtml(input: string): string {
  if (!input.trim()) return "";

  const withoutDangerous = input.replace(GLOBAL_STRIP, "");
  return withoutDangerous.replace(/<\/?[^>]+>/g, (tag) => sanitizeTagName(tag) || "");
}
