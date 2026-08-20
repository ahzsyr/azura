import type { FooterColumn } from "../../types";

export function validateMenu(column: FooterColumn): string | null {
  if (column.menuSource === "custom" && !(column.links ?? []).some((l) => l.label?.trim() && l.href?.trim())) {
    return "Add at least one link or choose another menu source.";
  }
  return null;
}
