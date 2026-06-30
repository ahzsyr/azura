/** Turn "home-office-routers" into "Home Office Routers". */
export function humanizeSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "Untitled";
  return trimmed
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Approximate read time from plain text (words / 200 wpm). */
export function estimateReadTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
