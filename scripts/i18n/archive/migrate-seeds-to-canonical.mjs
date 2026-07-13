/**
 * Migrate demo profile seeds: paired *En/*Ar -> canonical (En value only).
 * Handles multiline *Ar blocks and inline `{ titleEn: "x", titleAr: "y" }`.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "seeds", "demo-profiles");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

function renameEnKeys(line) {
  return line.replace(/\b(\w+)En(\s*:)/g, "$1$2");
}

function stripInlineAr(line) {
  let result = line.replace(
    /\b\w+Ar\s*:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[[^\]]*\]|[^,}\]]+)/g,
    ""
  );
  result = result.replace(/,\s*,/g, ",");
  result = result.replace(/,\s*([}\])])/g, "$1");
  return result;
}

function migrate(content) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const out = [];
  let skippingArValue = false;
  let arBaseIndent = 0;

  for (const line of lines) {
    const arStart = line.match(/^(\s*)(\w+)Ar\s*:\s*(.*)$/);
    if (arStart) {
      const rest = arStart[3].trim();
      if (!rest || rest === ",") {
        skippingArValue = true;
        arBaseIndent = arStart[1].length;
      }
      continue;
    }

    if (skippingArValue) {
      const nextProp = line.match(/^(\s*)(\w+)\s*:/);
      const closing = line.match(/^(\s*)[\}\]\)]/);
      if (
        (nextProp && nextProp[1].length <= arBaseIndent) ||
        (closing && closing[1].length < arBaseIndent)
      ) {
        skippingArValue = false;
      } else {
        continue;
      }
    }

    let next = stripInlineAr(line);
    next = renameEnKeys(next);
    out.push(next);
  }

  return out.join("\n");
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = readFileSync(file, "utf8");
  const next = migrate(original);
  if (next !== original) {
    writeFileSync(file, next, "utf8");
    changed++;
  }
}

console.log(`Migrated ${changed} seed files.`);
