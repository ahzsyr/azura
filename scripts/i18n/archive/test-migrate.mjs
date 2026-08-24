import { readFileSync } from "node:fs";

function stripInlineAr(line) {
  return line.replace(
    /\b\w+Ar\s*:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[[^\]]*\]|[^,}\]]+)/g,
    ""
  );
}
function renameEnKeys(line) {
  return line.replace(/\b(\w+)En(\s*:)/g, "$1$2");
}

const content = readFileSync("seeds/demo-profiles/brt-trading/pages.ts", "utf8");
const lines = content.split("\n").slice(28, 46);
const out = [];
let skippingArValue = false;
let arBaseIndent = 0;

for (const line of lines) {
  const arStart = line.match(/^(\s*)(\w+)Ar\s*:\s*(.*)$/);
  if (arStart) {
    console.log("AR SKIP:", JSON.stringify(line.slice(0, 50)));
    continue;
  }
  if (skippingArValue) {
    console.log("SKIPPING VALUE:", JSON.stringify(line.slice(0, 50)));
    continue;
  }
  let next = stripInlineAr(line);
  next = renameEnKeys(next);
  if (next.trim() === "," || next.trim() === "") {
    console.log("BAD LINE from:", JSON.stringify(line.slice(0, 60)), "=>", JSON.stringify(next));
  }
  out.push(next);
}
