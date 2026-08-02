/** Max stored inline SVG size (chars). */
export const CURRENCY_INLINE_SVG_MAX_LEN = 100_000;

/**
 * Minimal hardening for admin-authored SVG shown via `set:html`.
 * Rejects non-SVG payloads and strips common script/event vectors.
 */
export function sanitizeCurrencyInlineSvg(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.length > CURRENCY_INLINE_SVG_MAX_LEN) return null;
  if (!/^<\s*svg\b/i.test(s)) return null;

  let o = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  o = o.replace(/<\/script>/gi, "");
  o = o.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  o = o.replace(/\sxlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, "");
  o = o.replace(/\shref\s*=\s*["']\s*javascript:[^"']*["']/gi, "");
  return o;
}
