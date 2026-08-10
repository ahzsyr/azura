import fs from "node:fs";
import path from "node:path";

const files = [
  "seeds/demo-profiles/brt-trading/sample-data.ts",
  "seeds/demo-profiles/safar-al-madina/sample-data.ts",
];

for (const rel of files) {
  const file = path.join(process.cwd(), rel);
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(
    /demoMedia\(([^)]+),\s*"[^"]*"\)/g,
    (match, args) => {
      const parts = args.split(",").map((s) => s.trim());
      if (parts.length >= 4) {
        return `demoMedia(${parts.slice(0, 3).join(", ")})`;
      }
      return match;
    }
  );
  fs.writeFileSync(file, content);
  console.log("Fixed", rel);
}
