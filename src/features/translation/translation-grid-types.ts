import type { TranslationStatus } from "@prisma/client";

export type TranslationGridCell = {
  translationId?: string;
  value: string;
  status?: TranslationStatus;
};

export type EditableTranslationRow = {
  entityType: string;
  entityId: string;
  field: string;
  fieldLabel: string;
  sourceValue: string;
  cells: Record<string, TranslationGridCell>;
};

export type ListEditableTranslationsQuery = {
  entityType: string;
  localeCodes: string[];
  defaultLocaleCode: string;
  search?: string;
  statusFilter?: "all" | "missing" | "draft" | "published";
  page?: number;
  pageSize?: number;
};

export type ListEditableTranslationsResult = {
  rows: EditableTranslationRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type ImportTranslationRow = {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  value: string;
  status?: TranslationStatus;
};

export type ImportValidationError = {
  row: number;
  message: string;
};

export type ImportPreviewResult = {
  valid: ImportTranslationRow[];
  errors: ImportValidationError[];
  totalParsed: number;
};

export type BulkSaveCellInput = {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  value: string;
  status?: TranslationStatus;
  delete?: boolean;
};

export type BulkSaveResult = {
  success: boolean;
  upsertedCount: number;
  deletedCount: number;
  errors: Array<{ key: string; message: string }>;
};

export function translationCellKey(
  entityType: string,
  entityId: string,
  field: string,
  localeCode: string
): string {
  return `${entityType}|${entityId}|${field}|${localeCode.toLowerCase()}`;
}

export function parseTranslationCellKey(key: string): {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
} | null {
  const parts = key.split("|");
  if (parts.length !== 4) return null;
  const [entityType, entityId, field, localeCode] = parts;
  return { entityType, entityId, field, localeCode };
}
