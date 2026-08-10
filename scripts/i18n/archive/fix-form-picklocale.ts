import * as fs from "fs";
import * as path from "path";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: fix-form-picklocale.ts is disabled by default.");
}

const formFiles = [
  "src/features/pricing-plans/admin/pricing-plan-set-form.tsx",
  "src/features/pricing-calculators/admin/pricing-calculator-form.tsx",
  "src/features/knowledge-base/admin/knowledge-base-form.tsx",
  "src/features/documentation/admin/doc-portal-form.tsx",
  "src/features/status/admin/status-board-form.tsx",
  "src/features/team/admin/team-directory-form.tsx",
  "src/features/partners/admin/partner-program-form.tsx",
];

for (const fp of formFiles) {
  let content = fs.readFileSync(fp, "utf8");
  content = content.replace(
    /import \{ pickLocale \} from "@\/features\/portal-blocks\/lib\/pick-locale";\n/g,
    ""
  );
  // value bindings should use draft state keys, not pickLocale
  content = content.replace(/value=\{pickLocale\((\w+), '[^']+', 'en'\)\}/g, "value={$1.nameEn}");
  content = content.replace(/value=\{pickLocale\((\w+), 'label', 'en'\)\}/g, "value={$1.labelEn}");
  content = content.replace(/value=\{pickLocale\((\w+), 'title', 'en'\)\}/g, "value={$1.titleEn}");
  fs.writeFileSync(fp, content);
  console.log("Fixed", fp);
}
