/**
 * Fix inline duplicate object keys: { title: "en", title: "ar" } -> { title: "en" }
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [join(process.cwd(), "seeds"), join(process.cwd(), "src")];

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

function stripInlineDuplicateKeys(content) {
  let result = content;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(/(\b[\w$]+):\s*(("(?:\\.|[^"\\])*")|\[[^\]]*\]),\s*\1:/g, "$1: $2,");
  }
  return result;
}

function stripAltEnAr(content) {
  return content
    .replace(/\baltEn:/g, "alt:")
    .replace(/\baltAr:/g, "alt:")
    .replace(/,\s*alt:\s*"[^"]*"/g, (match, offset, str) => {
      const before = str.slice(0, offset);
      if (before.lastIndexOf("alt:") > before.lastIndexOf("{")) return "";
      return match;
    });
}

let changed = 0;
for (const root of ROOTS) {
  try {
    readdirSync(root);
  } catch {
    continue;
  }
  for (const file of walk(root)) {
    let content = readFileSync(file, "utf8");
    let next = stripInlineDuplicateKeys(content);
    if (file.includes("seeds")) {
      next = stripAltEnAr(next);
      next = stripInlineDuplicateKeys(next);
    }
    if (next !== content) {
      writeFileSync(file, next, "utf8");
      changed++;
    }
  }
}

console.log(`Fixed inline duplicates in ${changed} files.`);
