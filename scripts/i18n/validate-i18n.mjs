/**
 * Validate i18n completeness across message files and enabled locales.
 * Run: npm run i18n:validate
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      keys.push(path);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, path));
    }
  }
  return keys;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const messagesDir = join(process.cwd(), "messages");
const files = readdirSync(messagesDir).filter((f) => f.endsWith(".json"));

if (files.length === 0) {
  console.error("No message files found in messages/");
  process.exit(1);
}

const baseFile = files.includes("en.json") ? "en.json" : files[0];
const baseKeys = new Set(flattenKeys(loadJson(join(messagesDir, baseFile))));

let hasErrors = false;
const warnings = [];

for (const file of files) {
  if (file === baseFile) continue;
  const keys = new Set(flattenKeys(loadJson(join(messagesDir, file))));
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));

  if (missing.length > 0) {
    hasErrors = true;
    console.error(`\n❌ ${file}: ${missing.length} missing keys (vs ${baseFile})`);
    missing.slice(0, 20).forEach((k) => console.error(`   - ${k}`));
    if (missing.length > 20) console.error(`   ... and ${missing.length - 20} more`);
  }

  if (extra.length > 0) {
    warnings.push(`${file}: ${extra.length} extra keys not in ${baseFile}`);
  }
}

for (const file of files) {
  const locale = file.replace(".json", "");
  if (!/^[a-z]{2}(-[a-z]{2})?$/i.test(locale)) {
    warnings.push(`${file}: non-standard locale code "${locale}"`);
  }
}

if (warnings.length > 0) {
  console.warn("\n⚠ Warnings:");
  warnings.forEach((w) => console.warn(`   ${w}`));
}

if (hasErrors) {
  console.error("\nValidation failed.");
  process.exit(1);
}

console.log(`\n✓ i18n validation passed (${files.length} locales, ${baseKeys.size} keys in ${baseFile})`);
