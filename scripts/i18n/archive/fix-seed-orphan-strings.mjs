/**
 * Remove orphaned Arabic continuation strings left after En/Ar → canonical merge.
 * Keeps the first string value; drops following indented string literals without keys.
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

function isOrphanStringLine(line) {
  return /^\s+"[^"]*",?\s*$/.test(line) || /^\s+"[^"]*"\s*$/.test(line);
}

function isValueContinuation(prev, line) {
  if (!prev || !isOrphanStringLine(line)) return false;
  const trimmedPrev = prev.trim();
  if (trimmedPrev.endsWith(",") && /^"[^"]*",?$/.test(trimmedPrev.replace(/^\s+/, ""))) {
    return true;
  }
  if (trimmedPrev.endsWith('"') || trimmedPrev.endsWith('",')) {
    return true;
  }
  return false;
}

function dedupeObjectKeys(content) {
  const lines = content.split("\n");
  const out = [];
  const keyStack = [];

  for (const line of lines) {
    const indent = line.match(/^(\s*)/)?.[1] ?? "";
    if (/^\s*\}/.test(line)) {
      while (keyStack.length && keyStack[keyStack.length - 1].indent.length >= indent.length) {
        keyStack.pop();
      }
    }

    const prop = line.match(/^(\s*)([\w$]+)(\?)?:\s*/);
    if (prop && !line.trim().startsWith("//")) {
      const key = prop[2];
      const top = keyStack[keyStack.length - 1];
      if (top && top.indent === prop[1] && top.key === key) {
        continue;
      }
      keyStack.push({ indent: prop[1], key });
    }

    if (out.length > 0 && isValueContinuation(out[out.length - 1], line)) {
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = readFileSync(file, "utf8");
  const next = dedupeObjectKeys(original);
  if (next !== original) {
    writeFileSync(file, next, "utf8");
    changed++;
    console.log("Fixed", file);
  }
}

console.log(`Done. ${changed} files fixed.`);
