import type { Product } from "@/features/products/types";
import { validateTemplateId } from "@/features/products/layout-templates/registry-meta";

function csvField(text: string, header: string): string | null {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2) return null;
  const headers = parseCsvLine(lines[0] ?? "");
  const index = headers.findIndex((h) => h.trim().toLowerCase() === header.toLowerCase());
  if (index < 0) return null;
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i] ?? "");
    const value = cols[index]?.trim();
    if (value) return value;
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function readLayoutHint(raw: Record<string, unknown>, csvText?: string): string | null {
  const fromJson = [
    raw.page_layout_template,
    raw.output_format,
    raw._output_format,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);
  if (fromJson) return fromJson;
  if (!csvText) return null;
  return (
    csvField(csvText, "Meta: _output_format") ||
    csvField(csvText, "_output_format") ||
    csvField(csvText, "output_format")
  );
}

/**
 * Map converter `output_format` / CSV `Meta: _output_format` onto `page_layout_template`.
 * Never overwrites an explicit product template (including `null` inherit).
 */
export function applyUnifiImportLayoutHint(
  raw: Record<string, unknown>,
  csvText?: string,
): Record<string, unknown> {
  const existing = raw.page_layout_template;
  if (existing != null && String(existing).trim() !== "") return raw;
  const hint = readLayoutHint(raw, csvText);
  if (!hint) return raw;
  if (validateTemplateId(hint) !== "unifi" && hint.toLowerCase() !== "unifi") return raw;
  return { ...raw, page_layout_template: "unifi" };
}

export function applyUnifiImportLayout(product: Product, csvText?: string): Product {
  return applyUnifiImportLayoutHint(product as unknown as Record<string, unknown>, csvText) as unknown as Product;
}
