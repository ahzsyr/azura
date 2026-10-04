#!/usr/bin/env node
/**
 * CI: every block type in BLOCK_DEFINITIONS must have view + fields dispatch
 * registration (registry component and/or legacy switch allowlist).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const definitionsPath = path.join(root, "src/features/builder/registry/definitions.ts");
const dispatchPath = path.join(root, "src/features/builder/registry/block-cms-dispatch.ts");

const definitionsSrc = fs.readFileSync(definitionsPath, "utf8");
const dispatchSrc = fs.readFileSync(dispatchPath, "utf8");

const definitionTypes = [
  ...new Set(
    [...definitionsSrc.matchAll(/^\s+type:\s*"([A-Za-z][A-Za-z0-9]*)"/gm)].map((m) => m[1]),
  ),
];

function extractObjectKeys(source, objectName) {
  const start = source.indexOf(`export const ${objectName}`);
  if (start < 0) return new Set();
  const brace = source.indexOf("{", start);
  if (brace < 0) return new Set();
  let depth = 0;
  let end = brace;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(brace, end + 1);
  return new Set([...body.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*)\s*:/gm)].map((m) => m[1]));
}

function extractSetEntries(source, setName) {
  const start = source.indexOf(`export const ${setName}`);
  if (start < 0) return new Set();
  const bracket = source.indexOf("[", start);
  if (bracket < 0) return new Set();
  let depth = 0;
  let end = bracket;
  for (let i = bracket; i < source.length; i++) {
    const ch = source[i];
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(bracket, end + 1);
  return new Set([...body.matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g)].map((m) => m[1]));
}

const fieldsRegistry = extractObjectKeys(dispatchSrc, "BLOCK_FIELDS_REGISTRY");
const fieldsLegacy = extractSetEntries(dispatchSrc, "BLOCK_FIELDS_LEGACY_TYPES");
const viewExtracted = extractSetEntries(dispatchSrc, "BLOCK_VIEW_EXTRACTED_TYPES");
// Legacy view set may be built from BLOCK_DEFINITIONS.map — treat all defs as legacy-covered
// when the set is constructed that way; also accept explicit string entries.
const viewLegacyExplicit = extractSetEntries(dispatchSrc, "BLOCK_VIEW_LEGACY_TYPES");
const viewLegacyFromDefs = dispatchSrc.includes("BLOCK_DEFINITIONS.map((def) => def.type)");
const viewLegacy = viewLegacyFromDefs ? new Set(definitionTypes) : viewLegacyExplicit;

const orphanFields = definitionTypes.filter(
  (type) => !fieldsRegistry.has(type) && !fieldsLegacy.has(type),
);
const orphanViews = definitionTypes.filter(
  (type) => !viewExtracted.has(type) && !viewLegacy.has(type),
);

let failures = 0;

if (definitionTypes.length === 0) {
  console.error("check-orphan-blocks: failed to parse BLOCK_DEFINITIONS types");
  process.exit(1);
}

if (orphanFields.length > 0) {
  failures += orphanFields.length;
  console.error("Orphan fields (no registry + no legacy):");
  for (const type of orphanFields) console.error(`  - ${type}`);
}

if (orphanViews.length > 0) {
  failures += orphanViews.length;
  console.error("Orphan views (no extracted + no legacy):");
  for (const type of orphanViews) console.error(`  - ${type}`);
}

if (failures > 0) {
  console.error(`\ncheck-orphan-blocks: ${failures} orphan registration(s)`);
  process.exit(1);
}

console.log(
  `check-orphan-blocks: ok (${definitionTypes.length} types; fields registry=${fieldsRegistry.size} legacy=${fieldsLegacy.size}; views extracted=${viewExtracted.size})`,
);
