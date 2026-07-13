#!/usr/bin/env node
/**
 * Generate prisma-metadata.json from the multi-file Prisma schema folders.
 * Output: src/generated/prisma-metadata.json
 *
 * This is run at prebuild time (alongside profile:generate and middleware:manifest)
 * so the Schema Explorer always reflects the current schema without hand-maintenance.
 *
 * Usage:
 *   node scripts/build/generate-prisma-metadata.mjs
 *   npm run prisma-metadata:generate
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outFile = path.join(root, "src", "generated", "prisma-metadata.json");

// ---------------------------------------------------------------------------
// Schema reading — reuse the multi-file approach from export-imports.ts
// ---------------------------------------------------------------------------

function readMultiFileSchema(schemaDir) {
  return fs
    .readdirSync(schemaDir)
    .filter((f) => f.endsWith(".prisma"))
    .sort()
    .map((f) => fs.readFileSync(path.join(schemaDir, f), "utf-8"))
    .join("\n\n");
}

// Prefer MySQL schema; PostgreSQL mirrors it.
const SCHEMA_DIR = path.join(root, "prisma", "schema", "mysql");
const SCHEMA_TEXT = readMultiFileSchema(SCHEMA_DIR);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse Prisma schema text into a list of model descriptors.
 *
 * For each model we extract:
 *   - name
 *   - fields: [{ name, type, isOptional, isList, isRelation, hasDefault }]
 *   - relations: [{ field, referencedModel }]
 *   - indexes: string[]     (@@index directives)
 *   - uniqueConstraints: string[]  (@@unique directives)
 */
function parseSchema(text) {
  const models = [];
  const lines = text.split("\n");

  let current = null;

  for (const raw of lines) {
    const line = raw.trim();

    // Model open
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      current = {
        name: modelMatch[1],
        fields: [],
        relations: [],
        indexes: [],
        uniqueConstraints: [],
      };
      continue;
    }

    // Model close
    if (line === "}" && current) {
      models.push(current);
      current = null;
      continue;
    }

    if (!current) continue;

    // @@index / @@unique table-level attributes
    if (line.startsWith("@@index")) {
      current.indexes.push(line);
      continue;
    }
    if (line.startsWith("@@unique")) {
      current.uniqueConstraints.push(line);
      continue;
    }

    // Skip blank lines and other directives
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

    // Field line: `fieldName  FieldType?  @default(...) @relation(...)`
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
    if (!fieldMatch) continue;

    const [, fieldName, fieldType, isList, isOptional] = fieldMatch;

    // Skip Prisma-internal attributes
    if (fieldName.startsWith("@@")) continue;

    const hasDefault = line.includes("@default(");
    const isRelation = line.includes("@relation(");

    // Extract referenced model from @relation(fields: [...], references: [...])
    if (isRelation) {
      current.relations.push({
        field: fieldName,
        referencedModel: fieldType,
      });
    }

    current.fields.push({
      name: fieldName,
      type: fieldType,
      isList: Boolean(isList),
      isOptional: Boolean(isOptional),
      isRelation,
      hasDefault,
    });
  }

  return models;
}

// ---------------------------------------------------------------------------
// Generate and write
// ---------------------------------------------------------------------------

const models = parseSchema(SCHEMA_TEXT);

const output = {
  generatedAt: new Date().toISOString(),
  modelCount: models.length,
  models,
};

fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

console.log(
  `[prisma-metadata] Generated ${models.length} models → ${path.relative(root, outFile)}`
);
