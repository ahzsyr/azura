import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  getSeedAdminEmail,
  getSeedAdminPassword,
} from "../src/config/site";
import {
  getFactoryBrandConfig,
  getFactoryCompanyInfoFields,
  getFactoryFooterConfig,
  getFactoryFooterWorkspace,
  getFactoryHeaderConfig,
  getFactoryHeaderWorkspace,
} from "../src/config/factory-defaults";
import { seedContentPlatform } from "./seed-content";
import { seedBilingualFields } from "../scripts/i18n/seed-translations-helper";

const prisma = new PrismaClient();

const EMPTY_BLOCKS: Prisma.InputJsonValue = [];

async function main() {
  const adminEmail = getSeedAdminEmail();
  const adminPassword = getSeedAdminPassword();

  console.log("Seeding database (zero-data mode)…");

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  const company = getFactoryCompanyInfoFields();

  await prisma.companyInfo.upsert({
    where: { id: "default" },
    update: company,
    create: { id: "default", ...company },
  });

  await seedContentPlatform(prisma);

  const themeDefaults = {
    preset: "CLASSIC" as const,
    primaryColor: "#047857",
    secondaryColor: "#d4af37",
    typography: { bodyFont: "Plus Jakarta Sans", headingFont: "Amiri", baseFontSize: "16px", headingScale: 1.25 },
    brandConfig: getFactoryBrandConfig(),
    headerConfig: getFactoryHeaderConfig(),
    footerConfig: getFactoryFooterConfig(),
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: true,
    spacingScale: 1,
    customCss: null,
  };

  for (const id of ["published", "draft"]) {
    await prisma.siteTheme.upsert({
      where: { id },
      update: themeDefaults,
      create: { id, ...themeDefaults },
    });
  }

  const headerWorkspace = getFactoryHeaderWorkspace();
  const footerWorkspace = getFactoryFooterWorkspace();
  for (const [namespace, data] of [
    ["header-workspace", headerWorkspace],
    ["footer-workspace", footerWorkspace],
  ] as const) {
    const existing = await prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace, key: "default" } },
    });
    if (existing) {
      console.log(`Skipping ${namespace} seed — existing record preserved.`);
      continue;
    }
    await prisma.jsonStore.create({
      data: { namespace, key: "default", data: data as unknown as Prisma.InputJsonValue },
    });
    console.log(`Created ${namespace} default record.`);
  }

  const cmsPageSeeds = [
    { slug: "home", templateKey: "home", titleEn: "Home" },
    { slug: "about", templateKey: "about", titleEn: "About Us" },
    { slug: "contact", templateKey: "contact", titleEn: "Contact" },
    { slug: "packages", templateKey: "packages", titleEn: "Packages" },
    { slug: "gallery", templateKey: "gallery", titleEn: "Gallery" },
    { slug: "testimonials", templateKey: "testimonials", titleEn: "Testimonials" },
    { slug: "hotels-transport", templateKey: "hotels-transport", titleEn: "Hotels & Transport" },
    { slug: "products", templateKey: "products", titleEn: "Products" },
    { slug: "collections", templateKey: "collections", titleEn: "Collections" },
    { slug: "services", templateKey: "services", titleEn: "Services" },
    { slug: "compare", templateKey: "compare", titleEn: "Compare" },
    { slug: "favorites", templateKey: "favorites", titleEn: "Favorites" },
    { slug: "account", templateKey: "account", titleEn: "Account" },
  ];

  for (const p of cmsPageSeeds) {
    const page = await prisma.cmsPage.upsert({
      where: { slug: p.slug },
      update: {
        blocks: EMPTY_BLOCKS,
        status: "DRAFT",
        publishedAt: null,
      },
      create: {
        slug: p.slug,
        templateKey: p.templateKey,
        status: "DRAFT",
        blocks: EMPTY_BLOCKS,
      },
    });
    await seedBilingualFields(prisma, "CmsPage", page.id, {
      title: { en: p.titleEn, ar: "" },
      subtitle: { en: "", ar: "" },
    });
  }

  for (const locale of ["en"]) {
    const custom404 = await prisma.custom404.upsert({
      where: { locale },
      update: {
        blocks: EMPTY_BLOCKS,
      },
      create: {
        locale,
        blocks: EMPTY_BLOCKS,
      },
    });
    await seedBilingualFields(prisma, "Custom404", custom404.id, {
      title: { en: "", ar: "" },
      content: { en: "", ar: "" },
    });
  }

  const localeSeeds = [
    {
      code: "en",
      urlPrefix: "en",
      label: "English",
      htmlLang: "en",
      dir: "ltr",
      flag: "🇺🇸",
      dateLocale: "en-US",
      currency: "USD",
      numberLocale: "en-US",
      isEnabled: true,
      isDefault: true,
      sortOrder: 0,
    },
  ];

  await prisma.localeConfig.deleteMany({ where: { code: "ar" } });

  for (const loc of localeSeeds) {
    await prisma.localeConfig.upsert({
      where: { code: loc.code },
      update: loc,
      create: loc,
    });
  }

  try {
    const { searchIndexer } = await import("../src/features/search/search-indexer.service");
    await searchIndexer.rebuildAll();
    console.log("Search index rebuilt.");
  } catch (e) {
    console.warn("Search index rebuild skipped (run from app context):", e);
  }

  console.log("Seed completed successfully (zero-data mode).");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
