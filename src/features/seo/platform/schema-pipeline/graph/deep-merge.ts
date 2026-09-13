import type { SchemaNode } from "../types";

export type SchemaDiagnosticSeverity = "error" | "warning" | "info";

export type SchemaDiagnostic = {
  severity: SchemaDiagnosticSeverity;
  code: string;
  message: string;
  nodeId?: string;
};

export const PROTECTED_IDENTITY_FIELDS = ["@id", "@type", "url"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/** Strip null, empty strings, and empty arrays from a node (shallow per key). */
export function stripEmptyValues(node: SchemaNode): SchemaNode {
  const result: SchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (isEmptyValue(value)) continue;
    if (isPlainObject(value)) {
      const nested = stripEmptyValues(value as SchemaNode);
      if (Object.keys(nested).length > 0) result[key] = nested;
      continue;
    }
    if (Array.isArray(value)) {
      const filtered = value.filter((item) => !isEmptyValue(item));
      if (filtered.length > 0) result[key] = filtered;
      continue;
    }
    result[key] = value;
  }
  return result;
}

function normalizeSameAsUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function mergeSameAsArrays(base: unknown, override: unknown): string[] {
  const urls = new Set<string>();
  for (const source of [base, override]) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (typeof item === "string" && item.trim()) {
        urls.add(normalizeSameAsUrl(item));
      }
    }
  }
  return [...urls];
}

/** Schema-aware deep merge: later valid values win. */
export function deepMergeSchemaNodes(base: SchemaNode, override: SchemaNode): SchemaNode {
  const merged: SchemaNode = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    if (PROTECTED_IDENTITY_FIELDS.includes(key as (typeof PROTECTED_IDENTITY_FIELDS)[number])) {
      continue;
    }
    if (isEmptyValue(overrideValue)) continue;

    const baseValue = merged[key];

    if (key === "sameAs") {
      merged[key] = mergeSameAsArrays(baseValue, overrideValue);
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      merged[key] = deepMergeSchemaNodes(baseValue as SchemaNode, overrideValue as SchemaNode);
      continue;
    }

    if (Array.isArray(overrideValue)) {
      // Non-sameAs arrays: override replaces when override has content
      merged[key] = overrideValue;
      continue;
    }

    merged[key] = overrideValue;
  }

  return stripEmptyValues(merged);
}

export function nodeId(node: SchemaNode): string | undefined {
  const id = node["@id"];
  return typeof id === "string" ? id : undefined;
}

function typesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "string" && typeof b === "string") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => item === b[index]);
  }
  return false;
}

/** Detect protected identity mutations between base and override. */
export function detectProtectedIdentityMutations(
  base: SchemaNode,
  override: SchemaNode,
): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = [];
  const id = nodeId(base) ?? nodeId(override);

  for (const field of PROTECTED_IDENTITY_FIELDS) {
    const baseVal = base[field];
    const overrideVal = override[field];
    if (overrideVal === undefined || isEmptyValue(overrideVal)) continue;
    if (baseVal === undefined || isEmptyValue(baseVal)) continue;

    const changed =
      field === "@type" ? !typesEqual(baseVal, overrideVal) : baseVal !== overrideVal;

    if (changed) {
      diagnostics.push({
        severity: "error",
        code: "PROTECTED_IDENTITY_MUTATION",
        message: `Override attempts to change protected field "${field}".`,
        nodeId: id,
      });
    }
  }

  return diagnostics;
}

export function mergeNodesById(
  existing: SchemaNode,
  incoming: SchemaNode,
): { node: SchemaNode; diagnostics: SchemaDiagnostic[] } {
  const diagnostics = detectProtectedIdentityMutations(existing, incoming);
  if (diagnostics.some((d) => d.severity === "error")) {
    return { node: existing, diagnostics };
  }
  return {
    node: deepMergeSchemaNodes(existing, incoming),
    diagnostics,
  };
}
