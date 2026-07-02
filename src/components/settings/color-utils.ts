const HEX6 = /^#([0-9a-fA-F]{6})$/;
const HEX3 = /^#([0-9a-fA-F]{3})$/;

export function isHexColor(value: string): boolean {
  const v = value.trim();
  return HEX6.test(v) || HEX3.test(v);
}

/** Expand #rgb to #rrggbb; returns null if not a valid hex color. */
export function normalizeHexColor(value: string): string | null {
  const v = value.trim();
  const m6 = v.match(HEX6);
  if (m6) return `#${m6[1].toLowerCase()}`;
  const m3 = v.match(HEX3);
  if (m3) {
    const [r, g, b] = m3[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/** Value for native `<input type="color">` (requires #rrggbb). */
export function toNativePickerHex(value: string, fallback = "#64748b"): string {
  return normalizeHexColor(value) ?? fallback;
}
