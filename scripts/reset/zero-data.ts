#!/usr/bin/env tsx
/**
 * Wipe runtime content: DB rows, catalog JSON, indexes, and JsonStore workspaces.
 * Usage: npm run db:zero-data
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
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
const DATA = join(ROOT, "seeds", "catalog");

const JSON_STORE_NAMESPACES = [
  "block-templates",
  "block-presets",
  "page-cache",
  "header-workspace",
  "footer-workspace",
] as const;

function blankStrings(value: unknown): unknown {
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return value.map(blankStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, blankStrings(v)])
    );
  }
  return value;
}

function deleteJsonFilesInDir(dir: string) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      rmSync(full, { recursive: true, force: true });
    } else if (entry.endsWith(".json")) {
      rmSync(full, { force: true });
    }
  }
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function wipeDatabase() {
  console.log("Wiping database content…");

  await prisma.cmsPageRevision.deleteMany();
  await prisma.postTagOnPost.deleteMany();
  await prisma.postCategoryOnPost.deleteMany();
  await prisma.post.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.postCategory.deleteMany();
  await prisma.postAuthor.deleteMany();

  await prisma.booking.deleteMany();
  await prisma.contentCollectionItem.deleteMany();
  await prisma.contentItemMedia.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.contentCollection.deleteMany();

  await prisma.galleryMedia.deleteMany();
  await prisma.gallery.deleteMany();
  await prisma.testimonialCollectionItem.deleteMany();
  await prisma.testimonialCollection.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.faqItem.deleteMany();
  await prisma.faqSet.deleteMany();

  await prisma.seoMeta.deleteMany();
  await prisma.entityTranslationVersion.deleteMany();
  await prisma.entityTranslation.deleteMany();
  await prisma.localizedSlug.deleteMany();
  await prisma.searchDocument.deleteMany();

  for (const namespace of JSON_STORE_NAMESPACES) {
    await prisma.jsonStore.deleteMany({ where: { namespace } });
  }

  await prisma.cmsPage.updateMany({
    data: {
      blocks: [] as Prisma.InputJsonValue,
      status: "DRAFT",
      publishedAt: null,
      scheduledAt: null,
    },
  });
  await prisma.entityTranslation.deleteMany({ where: { entityType: "CmsPage" } });

  await prisma.companyInfo.updateMany({
    data: getFactoryCompanyInfoFields(),
  });

  const brandConfig = getFactoryBrandConfig();
  const headerConfig = getFactoryHeaderConfig();
  const footerConfig = getFactoryFooterConfig();

  await prisma.siteTheme.updateMany({
    data: {
      brandConfig,
      headerConfig,
      footerConfig,
    },
  });

  await prisma.custom404.updateMany({
    data: {
      blocks: [] as Prisma.InputJsonValue,
    },
  });
  await prisma.entityTranslation.deleteMany({ where: { entityType: "Custom404" } });

  const headerWorkspace = getFactoryHeaderWorkspace();
  const footerWorkspace = getFactoryFooterWorkspace();

  for (const [namespace, data] of [
    ["header-workspace", headerWorkspace],
    ["footer-workspace", footerWorkspace],
  ] as const) {
    await prisma.jsonStore.upsert({
      where: { namespace_key: { namespace, key: "default" } },
      update: { data: data as unknown as Prisma.InputJsonValue },
      create: { namespace, key: "default", data: data as unknown as Prisma.InputJsonValue },
    });
  }

  console.log("Database content wiped.");
}

function wipeCatalogFiles() {
  console.log("Removing catalog JSON files…");

  for (const locale of ["en-us"]) {
    deleteJsonFilesInDir(join(DATA, locale, "products"));
    deleteJsonFilesInDir(join(DATA, locale, "collections"));
  }

  writeJson(join(DATA, "collections.json"), []);

  writeJson(join(DATA, "header.json"), getFactoryHeaderJsonFile());

  const sitePatch = getFactorySiteUiPatch();
  for (const locale of ["en-us"]) {
    const sitePath = join(DATA, locale, "ui", "site.json");
    if (existsSync(sitePath)) {
      const current = JSON.parse(readFileSync(sitePath, "utf-8")) as Record<string, unknown>;
      writeJson(sitePath, { ...current, ...sitePatch });
    }
    const globalPath = join(DATA, locale, "ui", "global.json");
    if (existsSync(globalPath)) {
      writeJson(globalPath, blankStrings(JSON.parse(readFileSync(globalPath, "utf-8"))));
    }
    const seoPath = join(DATA, locale, "seo", "pages.json");
    if (existsSync(seoPath)) {
      writeJson(seoPath, blankStrings(JSON.parse(readFileSync(seoPath, "utf-8"))));
    }
  }

  console.log("Catalog JSON files cleared.");
}

async function rebuildIndexes() {
  console.log("Rebuilding empty product indexes…");
  execSync("npm run catalog:index:force", { stdio: "inherit", cwd: ROOT, env: { ...process.env, SKIP_SEARCH_INDEX_SYNC: "0" } });
}

async function main() {
  console.log("Starting zero-data reset…\n");
  await wipeDatabase();
  wipeCatalogFiles();
  await rebuildIndexes();
  console.log("\nZero-data reset complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
