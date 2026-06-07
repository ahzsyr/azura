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
    await prisma.jsonStore.upsert({
      where: { namespace_key: { namespace, key: "default" } },
      update: { data: data as unknown as Prisma.InputJsonValue },
      create: { namespace, key: "default", data: data as unknown as Prisma.InputJsonValue },
    });
  }

  const cmsPageSeeds = [
    { slug: "home", templateKey: "home", titleEn: "Home", titleAr: "الرئيسية" },
    { slug: "about", templateKey: "about", titleEn: "About Us", titleAr: "من نحن" },
    { slug: "contact", templateKey: "contact", titleEn: "Contact", titleAr: "اتصل بنا" },
    { slug: "packages", templateKey: "packages", titleEn: "Packages", titleAr: "الباقات" },
    { slug: "gallery", templateKey: "gallery", titleEn: "Gallery", titleAr: "المعرض" },
    { slug: "testimonials", templateKey: "testimonials", titleEn: "Testimonials", titleAr: "آراء العملاء" },
    { slug: "hotels-transport", templateKey: "hotels-transport", titleEn: "Hotels & Transport", titleAr: "الفنادق والنقل" },
    { slug: "products", templateKey: "products", titleEn: "Products", titleAr: "المنتجات" },
    { slug: "collections", templateKey: "collections", titleEn: "Collections", titleAr: "المجموعات" },
    { slug: "services", templateKey: "services", titleEn: "Services", titleAr: "الخدمات" },
    { slug: "compare", templateKey: "compare", titleEn: "Compare", titleAr: "المقارنة" },
    { slug: "favorites", templateKey: "favorites", titleEn: "Favorites", titleAr: "المفضلة" },
    { slug: "account", templateKey: "account", titleEn: "Account", titleAr: "الحساب" },
  ];

  for (const p of cmsPageSeeds) {
    await prisma.cmsPage.upsert({
      where: { slug: p.slug },
      update: {
        titleEn: "",
        titleAr: "",
        excerptEn: "",
        excerptAr: "",
        blocks: EMPTY_BLOCKS,
        status: "DRAFT",
        publishedAt: null,
      },
      create: {
        slug: p.slug,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        excerptEn: "",
        excerptAr: "",
        templateKey: p.templateKey,
        status: "DRAFT",
        blocks: EMPTY_BLOCKS,
      },
    });
  }

  for (const locale of ["en", "ar"]) {
    await prisma.custom404.upsert({
      where: { locale },
      update: {
        titleEn: "",
        titleAr: "",
        bodyEn: "",
        bodyAr: "",
        blocks: EMPTY_BLOCKS,
      },
      create: {
        locale,
        titleEn: "",
        titleAr: "",
        bodyEn: "",
        bodyAr: "",
        blocks: EMPTY_BLOCKS,
      },
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
    {
      code: "ar",
      urlPrefix: "ar",
      label: "العربية",
      htmlLang: "ar",
      dir: "rtl",
      flag: "🇸🇦",
      dateLocale: "ar-AE",
      currency: "SAR",
      numberLocale: "ar-AE",
      isEnabled: false,
      isDefault: false,
      sortOrder: 1,
    },
  ];

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
