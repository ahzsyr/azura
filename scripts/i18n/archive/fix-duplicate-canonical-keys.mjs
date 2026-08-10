/**
 * Remove duplicate object/type keys introduced when merging *En/*Ar → canonical field.
 * Keeps the first occurrence (typically English/default).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  join(process.cwd(), "src"),
  join(process.cwd(), "seeds"),
  join(process.cwd(), "config"),
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function dedupeConsecutiveKeys(content) {
  const lines = content.split("\n");
  const out = [];
  const keyStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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

    const destructure = line.match(/^(\s*)(?:const|let|var)\s+\{([^}]+)\}/);
    if (destructure) {
      const parts = destructure[2]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const seen = new Set();
      const unique = [];
      for (const part of parts) {
        const name = part.split(":")[0].trim().replace(/^\.\.\./, "");
        if (name.startsWith("...")) {
          unique.push(part);
          continue;
        }
        if (seen.has(name)) continue;
        seen.add(name);
        unique.push(part);
      }
      if (unique.length !== parts.length) {
        out.push(`${destructure[1]}{ ${unique.join(", ")} }${line.slice(line.indexOf("}") + 1)}`);
        continue;
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

function fixFunctionParams(content) {
  return content.replace(
    /\(\{\s*([^}]+)\}\s*:\s*\{[^}]+\}\)/g,
    (match, params) => {
      const parts = params.split(",").map((p) => p.trim()).filter(Boolean);
      const seen = new Set();
      const unique = [];
      for (const part of parts) {
        const name = part.split(":")[0].trim();
        if (seen.has(name)) continue;
        seen.add(name);
        unique.push(part);
      }
      if (unique.length === parts.length) return match;
      return match.replace(params, unique.join(", "));
    }
  );
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
    let next = dedupeConsecutiveKeys(original);
    next = fixFunctionParams(next);
    if (next !== original) {
      writeFileSync(file, next, "utf8");
      changed++;
    }
  }
}

console.log(`Deduped ${changed} files.`);
