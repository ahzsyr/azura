import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const srcDir = join(root, "src");

const forbiddenPatterns = [
  {
    label: 'Arabic startsWith shortcut',
    pattern: /\.startsWith\(["']ar["']\)/,
  },
  {
    label: 'Arabic includes shortcut',
    pattern: /\.includes\(["']ar["']\)/,
  },
  {
    label: 'Arabic equality shortcut',
    pattern: /(^|[^=!])={2,3}\s*["']ar["']|["']ar["']\s*={2,3}[^=]/,
  },
];

const ignoredDirectories = new Set(["node_modules", ".next", ".git"]);
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function extensionOf(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirectories.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (allowedExtensions.has(extensionOf(fullPath))) {
      yield fullPath;
    }
  }
}

const violations = [];

for (const filePath of walk(srcDir)) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(line)) {
        violations.push({
          file: relative(root, filePath),
          line: index + 1,
          label,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Direction guardrail failed. Use shared direction utilities instead:");
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.label}: ${violation.text}`,
    );
  }
  process.exit(1);
}

