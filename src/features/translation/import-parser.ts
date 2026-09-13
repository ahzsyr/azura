import type { TranslationStatus } from "@prisma/client";
import { getEntityConfig } from "@/features/translation/entity-registry";
import type {
  ImportPreviewResult,
  ImportTranslationRow,
  ImportValidationError,
} from "@/features/translation/translation-grid-types";

const CSV_HEADER =
  "entityType,entityId,field,localeCode,value,status";

const VALID_STATUSES = new Set<TranslationStatus>(["DRAFT", "PUBLISHED", "REVIEW"]);

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function normalizeStatus(raw: string | undefined): TranslationStatus | undefined {
  if (!raw?.trim()) return undefined;
  const upper = raw.trim().toUpperCase() as TranslationStatus;
  return VALID_STATUSES.has(upper) ? upper : undefined;
}

function validateRow(
  row: Partial<ImportTranslationRow>,
  rowNumber: number
): { row?: ImportTranslationRow; error?: ImportValidationError } {
  const entityType = row.entityType?.trim();
  const entityId = row.entityId?.trim();
  const field = row.field?.trim();
  const localeCode = row.localeCode?.trim().toLowerCase();
  const value = row.value ?? "";

  if (!entityType) {
    return { error: { row: rowNumber, message: "Missing entityType" } };
  }
  if (!entityId) {
    return { error: { row: rowNumber, message: "Missing entityId" } };
  }
  if (!field) {
    return { error: { row: rowNumber, message: "Missing field" } };
  }
  if (!localeCode) {
    return { error: { row: rowNumber, message: "Missing localeCode" } };
  }

  const config = getEntityConfig(entityType);
  if (!config) {
    return { error: { row: rowNumber, message: `Unknown entityType: ${entityType}` } };
  }
  if (!config.fields.some((f) => f.field === field)) {
    return {
      error: { row: rowNumber, message: `Unknown field "${field}" for ${entityType}` },
    };
  }

  const statusRaw = row.status;
  if (typeof statusRaw === "string" && statusRaw.trim()) {
    const normalized = normalizeStatus(statusRaw);
    if (!normalized) {
      return {
        error: { row: rowNumber, message: `Invalid status: ${statusRaw}` },
      };
    }
  }

  return {
    row: {
      entityType,
      entityId,
      field,
      localeCode,
      value,
      status: normalizeStatus(typeof row.status === "string" ? row.status : undefined),
    },
  };
}

export function parseTranslationsCsv(content: string): ImportPreviewResult {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { valid: [], errors: [], totalParsed: 0 };
  }

  const header = lines[0].toLowerCase();
  const hasHeader =
    header.includes("entitytype") &&
    header.includes("entityid") &&
    header.includes("field") &&
    header.includes("localecode");

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const valid: ImportTranslationRow[] = [];
  const errors: ImportValidationError[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNumber = hasHeader ? i + 2 : i + 1;
    const cols = parseCsvLine(dataLines[i]);
    if (cols.length < 5) {
      errors.push({ row: rowNumber, message: "Expected at least 5 columns" });
      continue;
    }
    const [entityType, entityId, field, localeCode, value, statusRaw] = cols;
    const result = validateRow(
      {
        entityType,
        entityId,
        field,
        localeCode,
        value,
        status: normalizeStatus(statusRaw),
      },
      rowNumber
    );
    if (result.error) errors.push(result.error);
    else if (result.row) valid.push(result.row);
  }

  return { valid: dedupeImportRows(valid), errors, totalParsed: dataLines.length };
}

export function parseTranslationsJson(content: string): ImportPreviewResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      valid: [],
      errors: [{ row: 0, message: "Invalid JSON" }],
      totalParsed: 0,
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: [],
      errors: [{ row: 0, message: "JSON must be an array of translation objects" }],
      totalParsed: 0,
    };
  }

  const valid: ImportTranslationRow[] = [];
  const errors: ImportValidationError[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Partial<ImportTranslationRow>;
    const result = validateRow(item, i + 1);
    if (result.error) errors.push(result.error);
    else if (result.row) valid.push(result.row);
  }

  return { valid: dedupeImportRows(valid), errors, totalParsed: parsed.length };
}

function dedupeImportRows(rows: ImportTranslationRow[]): ImportTranslationRow[] {
  const map = new Map<string, ImportTranslationRow>();
  for (const row of rows) {
    const key = `${row.entityType}|${row.entityId}|${row.field}|${row.localeCode}`;
    map.set(key, row);
  }
  return [...map.values()];
}

export function rowsToCsv(rows: ImportTranslationRow[]): string {
  const lines = [CSV_HEADER];
  for (const row of rows) {
    const escaped = `"${row.value.replace(/"/g, '""')}"`;
    lines.push(
      `${row.entityType},${row.entityId},${row.field},${row.localeCode},${escaped},${row.status ?? "PUBLISHED"}`
    );
  }
  return lines.join("\n");
}

export function editableRowsToCsv(
  rows: Array<{
    entityType: string;
    entityId: string;
    field: string;
    localeCode: string;
    value: string;
    status?: TranslationStatus;
  }>
): string {
  return rowsToCsv(
    rows.map((r) => ({
      entityType: r.entityType,
      entityId: r.entityId,
      field: r.field,
      localeCode: r.localeCode,
      value: r.value,
      status: r.status,
    }))
  );
}
