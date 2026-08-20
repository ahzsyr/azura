import type { IconSource } from "@prisma/client";

/** Map Prisma IconSource → picker discriminant source. */
export function iconSourceToPickSource(
  source: IconSource | string,
): "builtin" | "custom" | "font" {
  switch (source) {
    case "BUILTIN":
      return "builtin";
    case "CUSTOM":
      return "custom";
    case "FONT":
      return "font";
    default:
      return "builtin";
  }
}
