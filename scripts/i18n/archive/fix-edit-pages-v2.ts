import * as fs from "fs";
import * as path from "path";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: fix-edit-pages-v2.ts is disabled by default.");
}

const modules = [
  { mod: "team", entity: "TeamDirectory", prop: "directory", page: "TeamDirectoryEditPage" },
  { mod: "pricing-plans", entity: "PricingPlanSet", prop: "planSet", page: "PricingPlanSetEditPage" },
  { mod: "pricing-calculators", entity: "PricingCalculator", prop: "calculator", page: "PricingCalculatorEditPage" },
  { mod: "releases", entity: "ReleaseSet", prop: "releaseSet", page: "ReleaseSetEditPage" },
  { mod: "documentation", entity: "DocPortal", prop: "portal", page: "DocPortalEditPage" },
  { mod: "status", entity: "StatusBoard", prop: "board", page: "StatusBoardEditPage" },
  { mod: "partners", entity: "PartnerProgram", prop: "program", page: "PartnerProgramEditPage" },
];

const importPick = 'import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";\n';

for (const m of modules) {
  const adminDir = path.join("src/features", m.mod, "admin");
  for (const file of fs.readdirSync(adminDir)) {
    if (!file.endsWith(".tsx")) continue;
    const fp = path.join(adminDir, file);
    let content = fs.readFileSync(fp, "utf8");
    if (content.includes("pickLocale") && !content.includes("portal-blocks/lib/pick-locale")) {
      content = importPick + content;
      fs.writeFileSync(fp, content);
      console.log("import", fp);
    }
  }

  const editFile = fs
    .readdirSync(adminDir)
    .find((f) => f.endsWith("-edit-page.tsx"));
  if (!editFile) continue;
  const editPath = path.join(adminDir, editFile);
  let edit = fs.readFileSync(editPath, "utf8");
  edit = edit.replace(
    /title=\{`Edit: \$\{pickLocale\([^`]+\}`\}/,
    "title={`Edit: ${displayTitle}`}"
  );
  if (!edit.includes("displayTitle: string")) {
    edit = edit.replace(
      /export function \w+\(\{\s*(\w+),?\s*\}:\s*\{/,
      "export function $&".replace("$&", "") // skip
    );
    edit = edit.replace(
      /(\w+): ([\w&{}[\].\s|]+);\n\}\) \{/,
      "$1: $2;\n  displayTitle: string;\n}) {"
    );
    edit = edit.replace(
      /export function (\w+)\(\{\n  (\w+),\n\}/,
      "export function $1({\n  $2,\n  displayTitle,\n}"
    );
  }
  fs.writeFileSync(editPath, edit);

  const routePath = `src/app/admin/(dashboard)/${m.mod}/[id]/page.tsx`;
  if (!fs.existsSync(routePath)) continue;
  let route = fs.readFileSync(routePath, "utf8");
  if (!route.includes("loadAdminDisplayTitle")) {
    route = route.replace(
      'import { notFound } from "next/navigation";',
      'import { notFound } from "next/navigation";\nimport { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";'
    );
    const serviceImport = route.match(/import \{ (\w+) \} from "@\/features\/[^"]+\/service";/)?.[1];
    const entityVar = route.match(/const (\w+) = await/)?.[1] ?? m.prop;
    route = route.replace(
      `if (!${entityVar}) notFound();`,
      `if (!${entityVar}) notFound();\n  const displayTitle = await loadAdminDisplayTitle("${m.entity}", id, "title", ${entityVar}.slug);`
    );
    route = route.replace(
      `return <${m.page} ${m.prop}={${m.prop}} />;`,
      `return <${m.page} ${m.prop}={${m.prop}} displayTitle={displayTitle} />;`
    );
    fs.writeFileSync(routePath, route);
    console.log("route", routePath);
  }
}
