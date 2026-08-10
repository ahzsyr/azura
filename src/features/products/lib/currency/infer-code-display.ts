export type CodeDisplay = "text" | "image" | "svg";

/** Mirrors legacy admin script: infer region-modal glyph mode from stored fields. */
export function inferCodeDisplay(c: {
  codeDisplay?: string;
  logo?: string;
  svgInline?: string;
}): CodeDisplay {
  const d = c.codeDisplay?.trim().toLowerCase();
  if (d === "text" || d === "image" || d === "svg") return d;
  if (typeof c.svgInline === "string" && c.svgInline.trim()) return "svg";
  if (typeof c.logo === "string" && c.logo.trim()) return "image";
  return "text";
}
