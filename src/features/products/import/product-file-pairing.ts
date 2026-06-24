import { parseJsonProducts } from "./json-parser";
import type { ProductImportData } from "./product-import.types";

export type PairSkipReason =
  | { kind: "csv_without_json"; file: string; stem: string; message: string }
  | { kind: "duplicate_stem"; file: string; stem: string; message: string }
  | { kind: "invalid_json"; file: string; message: string };

export type PairedImportPreview = {
  stem: string;
  jsonFile: string;
  pairedCsv?: string;
  productCount: number;
  ok: boolean;
  error?: string;
};

export type PairImportResult = {
  products: ProductImportData[];
  previews: PairedImportPreview[];
  skipped: PairSkipReason[];
  csvOnlyCount: number;
  hasImportableProducts: boolean;
};

export type ImportFileEntry = {
  name: string;
  content: string;
};

/** Normalize filename stem (strip extension and converter duplicate suffix " (n)"). */
export function fileStem(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const lower = base.toLowerCase();
  let stem = base;
  if (lower.endsWith(".json")) stem = base.slice(0, -5);
  else if (lower.endsWith(".csv")) stem = base.slice(0, -4);
  return stem.replace(/\s+\(\d+\)$/, "").trim();
}

function isJsonFile(name: string): boolean {
  return name.toLowerCase().endsWith(".json");
}

function isCsvFile(name: string): boolean {
  return name.toLowerCase().endsWith(".csv");
}

export function pairImportFileEntries(entries: ImportFileEntry[]): PairImportResult {
  const jsonEntries = entries.filter((e) => isJsonFile(e.name));
  const csvEntries = entries.filter((e) => isCsvFile(e.name));

  const csvByStem = new Map<string, string>();
  for (const csv of csvEntries) {
    const stem = fileStem(csv.name);
    if (!csvByStem.has(stem)) csvByStem.set(stem, csv.name);
  }

  const seenJsonStems = new Set<string>();
  const products: ProductImportData[] = [];
  const previews: PairedImportPreview[] = [];
  const skipped: PairSkipReason[] = [];

  for (const json of jsonEntries) {
    const stem = fileStem(json.name);
    if (seenJsonStems.has(stem)) {
      skipped.push({
        kind: "duplicate_stem",
        file: json.name,
        stem,
        message: `Duplicate JSON stem "${stem}" — only one JSON per product name is imported`,
      });
      previews.push({
        stem,
        jsonFile: json.name,
        productCount: 0,
        ok: false,
        error: "Duplicate stem",
      });
      continue;
    }
    seenJsonStems.add(stem);

    let parsed: Record<string, unknown>[];
    try {
      parsed = parseJsonProducts(json.content);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      skipped.push({ kind: "invalid_json", file: json.name, message });
      previews.push({
        stem,
        jsonFile: json.name,
        productCount: 0,
        ok: false,
        error: message,
      });
      continue;
    }

    if (parsed.length === 0) {
      skipped.push({
        kind: "invalid_json",
        file: json.name,
        message: "JSON file has no product objects",
      });
      previews.push({
        stem,
        jsonFile: json.name,
        productCount: 0,
        ok: false,
        error: "No products in file",
      });
      continue;
    }

    const pairedCsv = csvByStem.get(stem);
    previews.push({
      stem,
      jsonFile: json.name,
      pairedCsv,
      productCount: parsed.length,
      ok: true,
    });

    for (const product of parsed) {
      products.push({
        slug: "",
        product,
        sourceFile: json.name,
        pairedCsv,
      });
    }
  }

  let csvOnlyCount = 0;
  for (const csv of csvEntries) {
    const stem = fileStem(csv.name);
    if (seenJsonStems.has(stem)) continue;
    csvOnlyCount += 1;
    skipped.push({
      kind: "csv_without_json",
      file: csv.name,
      stem,
      message: `CSV "${csv.name}" has no companion JSON — upload the matching .json file`,
    });
    previews.push({
      stem,
      jsonFile: "—",
      pairedCsv: csv.name,
      productCount: 0,
      ok: false,
      error: "CSV without JSON",
    });
  }

  return {
    products,
    previews,
    skipped,
    csvOnlyCount,
    hasImportableProducts: products.length > 0,
  };
}

export async function pairImportFiles(files: File[]): Promise<PairImportResult> {
  const relevant = files.filter((f) => isJsonFile(f.name) || isCsvFile(f.name));
  const entries: ImportFileEntry[] = await Promise.all(
    relevant.map(async (file) => ({
      name: file.name,
      content: await file.text(),
    })),
  );
  return pairImportFileEntries(entries);
}
