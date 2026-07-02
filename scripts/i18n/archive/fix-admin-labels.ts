import * as fs from "fs";
import * as path from "path";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: fix-admin-labels.ts is disabled by default.");
}

const modules = [
  "pricing-plans",
  "pricing-calculators",
  "releases",
  "knowledge-base",
  "documentation",
  "status",
  "team",
  "partners",
];

let changed = 0;
for (const mod of modules) {
  const adminDir = path.join("src/features", mod, "admin");
  if (!fs.existsSync(adminDir)) continue;
  for (const file of fs.readdirSync(adminDir)) {
    if (!file.endsWith(".tsx")) continue;
    const fp = path.join(adminDir, file);
    let content = fs.readFileSync(fp, "utf8");
    const orig = content;
    if (!/\.(titleEn|nameEn|labelEn|descriptionEn)/.test(content)) continue;

    content = content.replace(/(\w+)\.titleEn/g, "pickLocale($1, 'title', 'en')");
    content = content.replace(/(\w+)\.nameEn/g, "pickLocale($1, 'name', 'en')");
    content = content.replace(/(\w+)\.labelEn/g, "pickLocale($1, 'label', 'en')");

    if (content !== orig) {
      if (!content.includes("pickLocale")) {
        content =
          "import { pickLocale } from \"@/features/portal-blocks/lib/pick-locale\";\n" + content;
      }
      fs.writeFileSync(fp, content);
      changed++;
      console.log("Updated", fp);
    }
  }
}
console.log("Total", changed);
