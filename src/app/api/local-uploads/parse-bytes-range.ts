/** Parse a single HTTP Range bytes request. Multi-range is not supported. */
export function parseBytesRange(
  rangeHeader: string | null,
  size: number,
): { start: number; end: number } | "invalid" | null {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return "invalid";

  const startToken = match[1] ?? "";
  const endToken = match[2] ?? "";
  if (!startToken && !endToken) return "invalid";

  let start: number;
  let end: number;

  if (!startToken) {
    const suffix = Number.parseInt(endToken, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number.parseInt(startToken, 10);
    end = endToken ? Number.parseInt(endToken, 10) : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid";
    if (start >= size) return "invalid";
    end = Math.min(end, size - 1);
    if (start > end) return "invalid";
  }

  return { start, end };
}
