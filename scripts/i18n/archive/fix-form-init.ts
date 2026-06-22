import * as fs from "fs";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: fix-form-init.ts is disabled by default.");
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
  content = content.replace(/pickLocale\([^)]+\)/g, '""');
  content = content.replace(/: ([a-z])\.(titleAr|nameAr|labelAr|excerptAr|bodyAr|descriptionAr|messageAr)/g, ': ""');
  fs.writeFileSync(fp, content);
  console.log("Cleared legacy init", fp);
}
