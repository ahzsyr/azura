/**
 * Restore ALL src files from git HEAD.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");

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

function gitHead(relPath) {
  try {
    return execSync(`git show HEAD:"${relPath.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

let restored = 0;
for (const file of walk(ROOT)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const head = gitHead(rel);
  if (!head) continue;
  const current = readFileSync(file, "utf8");
  if (current === head) continue;
  writeFileSync(file, head, "utf8");
  restored++;
}

console.log(`Restored ${restored} src files from git HEAD.`);
