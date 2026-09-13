/**
 * Restore src files from git HEAD except intentional i18n migration files.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");

const KEEP = new Set([
  "src/lib/utils.ts",
  "src/features/translation/translation-resolver.ts",
  "src/features/translation/bilingual-serialize.ts",
  "src/features/translation/admin-entity-helpers.ts",
  "src/features/translation/block-translation.ts",
  "src/features/catalog/locales.ts",
  "src/features/catalog/catalog-data-source.ts",
  "src/features/portal/lib/portal-translation.ts",
  "src/features/navigation/types.ts",
  "src/features/navigation/defaults.ts",
  "src/features/navigation/localize-menu.ts",
  "src/features/navigation/localize-menu-translations.ts",
  "src/features/navigation/admin/MenuItemModal.tsx",
  "src/features/announcement-bar/announcement-bar.schema.ts",
  "src/features/conversion-blocks/components/download-gate-view.tsx",
  "src/features/conversion-blocks/components/conversion-block-renderers.tsx",
  "src/features/setup/demo-import/types.ts",
  "src/lib/local-media-storage.ts",
  "src/features/comparison/comparison-engine.ts",
  "src/features/comparison/components/comparison-quick-add.tsx",
  "src/features/comparison/components/comparison-cards.tsx",
  "src/features/comparison/components/comparison-table.tsx",
  "src/features/comparison/components/comparison-drawer-bucket.tsx",
  "src/features/comparison/components/comparison-page.tsx",
  "src/features/comparison/get-compare-props.ts",
  "src/features/comparison/types.ts",
  "src/features/portal-blocks/components/team-directory-view.tsx",
  "src/features/portal-blocks/components/partner-directory-view.tsx",
  "src/features/portal-blocks/components/status-dashboard-view.tsx",
  "src/features/portal-blocks/components/knowledge-base-view.tsx",
  "src/features/portal-blocks/components/portal-block-renderers.tsx",
  "src/features/portal-blocks/components/pricing-calculator-view.tsx",
  "src/features/i18n/public-locale-context.ts",
  "src/features/translation/components/localized-fields.tsx",
  "src/features/translation/components/admin-localized-form-field.tsx",
  "src/features/translation/components/admin-localized-text-field.tsx",
  "src/features/translation/components/entity-localized-form-section.tsx",
  "src/features/products/products-data.service.ts",
  "src/features/products/index/product-index-loader.ts",
  "src/features/collections/collections-data.service.ts",
  "src/features/collections/collections-fs.ts",
  "src/i18n/catalog-ui-messages.ts",
  "src/i18n/request.ts",
  "src/features/search/lib/search-page-layout.ts",
  "src/features/search/admin/search-page-design-panel.tsx",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function gitHead(relPath) {
  try {
    return execSync(`git show HEAD:"${relPath.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

let restored = 0;
for (const file of walk(ROOT)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  if (KEEP.has(rel)) continue;
  const head = gitHead(rel);
  if (!head) continue;
  const current = readFileSync(file, "utf8");
  if (current === head) continue;
  writeFileSync(file, head, "utf8");
  restored++;
}

console.log(`Restored ${restored} src files from git HEAD (kept ${KEEP.size} i18n files).`);
