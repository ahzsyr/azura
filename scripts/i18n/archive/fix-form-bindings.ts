import * as fs from "fs";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: fix-form-bindings.ts is disabled by default.");
}

const fixes: Array<{ file: string; replacements: Array<[string, string]> }> = [
  {
    file: "src/features/knowledge-base/admin/knowledge-base-form.tsx",
    replacements: [
      ["excerptEn: a.excerptEn", 'excerptEn: ""'],
      ["bodyEn: a.bodyEn", 'bodyEn: ""'],
      ["value={cat.nameEn}", "value={cat.titleEn}"],
      ["value={article.nameEn}", "value={article.titleEn}"],
    ],
  },
  {
    file: "src/features/documentation/admin/doc-portal-form.tsx",
    replacements: [
      ["value={version.nameEn}", "value={version.labelEn}"],
      ["value={section.nameEn}", "value={section.titleEn}"],
    ],
  },
  {
    file: "src/features/status/admin/status-board-form.tsx",
    replacements: [
      ["descriptionEn: s.descriptionEn", 'descriptionEn: ""'],
      ["messageEn: i.messageEn", 'messageEn: ""'],
      ["messageEn: m.messageEn", 'messageEn: ""'],
      ["value={service.nameEn}", "value={service.nameEn}"],
      ["value={incident.nameEn}", "value={incident.titleEn}"],
      ["value={item.nameEn}", "value={item.titleEn}"],
    ],
  },
  {
    file: "src/features/pricing-calculators/admin/pricing-calculator-form.tsx",
    replacements: [["value={field.nameEn}", "value={field.labelEn}"]],
  },
  {
    file: "src/features/partners/admin/partner-program-form.tsx",
    replacements: [["descriptionEn: p.descriptionEn", 'descriptionEn: ""']],
  },
];

for (const { file, replacements } of fixes) {
  let content = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(file, content);
  console.log("Fixed", file);
}
