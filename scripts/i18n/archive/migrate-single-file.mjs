import { readFileSync, writeFileSync } from "node:fs";

function stripInlineAr(line) {
  let result = line.replace(
    /\b\w+Ar\s*:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[[^\]]*\]|[^,}\]]+)/g,
    ""
  );
  result = result.replace(/,\s*,/g, ",");
  result = result.replace(/,\s*([}\])])/g, "$1");
  return result;
}

function renameEnKeys(line) {
  return line.replace(/\b(\w+)En(\s*:)/g, "$1$2");
}

function migrateContent(content) {
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

const file = process.argv[2];
if (!file) {
  console.error("Usage: node migrate-single-file.mjs <path>");
  process.exit(1);
}
const content = readFileSync(file, "utf8");
writeFileSync(file, migrateContent(content));
console.log("Migrated", file);
