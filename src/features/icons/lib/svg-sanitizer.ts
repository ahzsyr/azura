import { z } from "zod";

export type SanitizedSvgResult = {
  svgContent: string;
  viewBox?: string;
};

// Strict defensive sanitizer for icon SVG uploads.
// For the initial scaffold we implement only the required security rejects; later phases can tighten/expand allow-lists.
export function sanitizeUploadedIconSvg(raw: string): SanitizedSvgResult | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^<\s*svg\b/i.test(s)) return null;

  // Strict defensive sanitizer for icon SVG uploads.
  // Strategy: reject anything that contains active content, unsafe URLs, or disallowed elements.
  // We do not attempt to “partially” sanitize into an unknown-safe state.
  const disallowedPatterns: RegExp[] = [
    /<\s*script\b[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi,
    /<\s*script\b/gi,
    /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, // on* event handlers
    /\shref\s*=\s*["']\s*javascript:[^"']*["']/gi,
    /\sxlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi,
    /\ssrc\s*=\s*["']\s*javascript:[^"']*["']/gi,
    /\s(href|src|xlink:href)\s*=\s*["']\s*data:text\/html[^"']*["']/gi,
    /\s(href|src|xlink:href)\s*=\s*["']\s*(?:https?:)?\/\/[^"']*["']/gi,
    /\s(href|src|xlink:href)\s*=\s*["']\s*(?:data:)[^"']*["']/gi,
    /\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    /<\s*foreignObject\b/gi,
    /<\s*iframe\b/gi,
    /<\s*object\b/gi,
    /<\s*embed\b/gi,
    /<\s*style\b[\s\S]*?>[\s\S]*?<\s*\/\s*style\s*>/gi,
  ];

  for (const re of disallowedPatterns) {
    if (re.test(s)) return null;
  }

  // Extract viewBox (best-effort).
  const viewBoxMatch = s.match(/\sviewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = viewBoxMatch?.[1];

  // Minimal "stripping": remove XML namespaces that sometimes include external refs.
  // We keep the rest byte-for-byte so the renderer always uses the sanitized `svgContent` produced here.
  const cleaned = s.replace(/xmlns(:xlink)?=["'][^"']*["']/gi, "");

  return {
    svgContent: cleaned,
    viewBox: z.string().optional().parse(viewBox),
  };
}

