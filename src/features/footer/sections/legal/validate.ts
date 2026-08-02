import type { FooterColumn } from "../../types";

export function validateLegal(column: FooterColumn): string | null {
  if (!(column.links ?? []).some((l) => l.label?.trim() && l.href?.trim())) {
    return "Add at least one legal link.";
  }
  return null;
}
