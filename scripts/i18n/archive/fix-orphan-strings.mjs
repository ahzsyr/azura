/**
 * Remove orphaned string literals and fix empty-string corruption from En/Ar merge.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [join(process.cwd(), "src"), join(process.cwd(), "seeds")];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function isOrphanStringLine(line) {
  return /^\s+"[^"]*",?\s*$/.test(line);
}

function clean(content) {
  const lines = content.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (out.length > 0 && isOrphanStringLine(line)) {
      const prev = out[out.length - 1].trim();
      if (prev.endsWith('"') || prev.endsWith('",') || prev.endsWith("],")) {
        continue;
      }
    }

    // { label: "en", "ar" } -> { label: "en" }
    line = line.replace(/,\s*"[^"]*"\s*(?=[,}\]])/g, "");

    // content: "", "" -> content: ""
    line = line.replace(/:\s*"",\s*""/g, ': ""');
    line = line.replace(/:\s*"",\s*""\s*,/g, ': "",');

    out.push(line);
  }

  return out.join("\n");
}

let changed = 0;
for (const root of ROOTS) {
  try {
    readdirSync(root);
  } catch {
    continue;
  }
  for (const file of walk(root)) {
    const original = readFileSync(file, "utf8");
    const next = clean(original);
    if (next !== original) {
      writeFileSync(file, next, "utf8");
      changed++;
    }
  }
}

console.log(`Cleaned ${changed} files.`);
