/**
 * Utilities for reading and writing structured CSS properties into/from
 * an inline style string without clobbering unrelated declarations.
 */

function parseStyleDeclarations(style: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const decl of style.split(";")) {
    const colon = decl.indexOf(":");
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim();
    if (prop) map.set(prop, val);
  }
  return map;
}

function stringifyStyleDeclarations(map: Map<string, string>): string {
  const parts: string[] = [];
  for (const [prop, val] of map) {
    if (val) parts.push(`${prop}: ${val}`);
  }
  return parts.join("; ");
}

/** Set or remove `text-align` in an inline style string. */
export function mergeTextAlign(style: string, value: string): string {
  const map = parseStyleDeclarations(style);
  if (!value || value === "default") {
    map.delete("text-align");
  } else {
    map.set("text-align", value);
  }
  return stringifyStyleDeclarations(map);
}

/** Read the current `text-align` value from an inline style string, or "default". */
export function readTextAlign(style: string): string {
  const map = parseStyleDeclarations(style);
  return map.get("text-align") ?? "default";
}

/** Read the `dir` attribute value as "ltr" | "rtl" | "default". */
export function readDirection(dir: string): string {
  if (dir === "ltr" || dir === "rtl") return dir;
  return "default";
}

/** No-op helper for symmetry — just returns the value to store as `dir` attribute. */
export function mergeDirection(dir: string): string | undefined {
  if (dir === "ltr" || dir === "rtl") return dir;
  return undefined;
}
