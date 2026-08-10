import type { FooterColumn } from "../../types";

export function validateText(column: FooterColumn): string | null {
  if (!column.body?.trim() && !column.title?.trim()) {
    return "Add a heading or body text.";
  }
  return null;
}
