#!/usr/bin/env tsx
/**
 * Reset branding, header/footer workspaces, and company profile to AZURA factory defaults.
 * Does not wipe CMS pages, products, or other content.
 *
 * Usage: npm run db:factory-defaults
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getFactoryBrandConfig,
  getFactoryCompanyInfoFields,
  getFactoryFooterConfig,
  getFactoryFooterWorkspace,
  getFactoryHeaderConfig,
  getFactoryHeaderJsonFile,
  getFactoryHeaderWorkspace,
  getFactorySiteUiPatch,
} from "../../src/config/factory-defaults";

const prisma = new PrismaClient();
const ROOT = process.cwd();

function writeJson(path: string, data: unknown) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function upsertJsonStore(namespace: string, key: string, data: unknown) {
  const payload = data as Prisma.InputJsonValue;
  await prisma.jsonStore.upsert({
    where: { namespace_key: { namespace, key } },
    update: { data: payload },
    create: { namespace, key, data: payload },
  });
}

async function resetDatabaseDefaults() {
  console.log("Applying AZURA factory defaults to database…");

  const company = getFactoryCompanyInfoFields();
  await prisma.companyInfo.upsert({
    where: { id: "default" },
    update: company,
    create: { id: "default", ...company },
  });

  const brandConfig = getFactoryBrandConfig();
  const headerConfig = getFactoryHeaderConfig();
  const footerConfig = getFactoryFooterConfig();

  await prisma.siteTheme.updateMany({
    data: {
      preset: "CLASSIC",
      primaryColor: "#047857",
      secondaryColor: "#d4af37",
      brandConfig,
      headerConfig,
      footerConfig,
    },
  });

  const headerWorkspace = getFactoryHeaderWorkspace();
  const footerWorkspace = getFactoryFooterWorkspace();

  await upsertJsonStore("header-workspace", "default", headerWorkspace);
  await upsertJsonStore("footer-workspace", "default", footerWorkspace);

  console.log("Database defaults applied.");
}

function resetCatalogJsonDefaults() {
  console.log("Updating catalog JSON defaults…");

  writeJson(join(ROOT, "seeds/catalog/header.json"), getFactoryHeaderJsonFile());

  const sitePatch = getFactorySiteUiPatch();
  for (const locale of ["en-us"]) {
    const sitePath = join(ROOT, "seeds/catalog", locale, "ui", "site.json");
    if (!existsSync(sitePath)) continue;
    const current = JSON.parse(readFileSync(sitePath, "utf-8")) as Record<string, unknown>;
    writeJson(sitePath, { ...current, ...sitePatch });
  }

  console.log("Catalog JSON defaults updated.");
}

async function main() {
  await resetDatabaseDefaults();
  resetCatalogJsonDefaults();
  console.log("\nFactory defaults restored (AZURA solution).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
