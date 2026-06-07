import type { Prisma, PrismaClient } from "@prisma/client";
import { BUILTIN_PAGE_TEMPLATE_BLOCKS } from "@/features/builder/builtin-page-template-blocks";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const EMPTY_BLOCKS: Prisma.InputJsonValue = [];

const HOME_LANDING_BLOCKS = BUILTIN_PAGE_TEMPLATE_BLOCKS.landing as unknown as Prisma.InputJsonValue;

function pageHasBlocks(blocks: unknown): boolean {
  return Array.isArray(blocks) && blocks.length > 0;
}

const CMS_PAGE_SEEDS = [
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
  { slug: "smart-home", templateKey: "smart-home", titleEn: "Smart Home", titleAr: "المنزل الذكي" },
  { slug: "security-solutions", templateKey: "security-solutions", titleEn: "Security Solutions", titleAr: "حلول الأمن" },
  { slug: "enterprise-wireless", templateKey: "enterprise-wireless", titleEn: "Enterprise Wireless", titleAr: "شبكات المؤسسات" },
] as const;

const LOCALE_SEEDS = [
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
] as const;

/** Publish homepage with starter landing blocks when missing or still draft. */
export async function ensurePublishedHomePage(tx: Tx): Promise<{ updated: boolean }> {
  const now = new Date();
  const existing = await tx.cmsPage.findUnique({ where: { slug: "home" } });

  if (!existing) {
    await tx.cmsPage.create({
      data: {
        slug: "home",
        titleEn: "Home",
        titleAr: "الرئيسية",
        excerptEn: "",
        excerptAr: "",
        templateKey: "home",
        status: "PUBLISHED",
        publishedAt: now,
        blocks: HOME_LANDING_BLOCKS,
      },
    });
    return { updated: true };
  }

  if (existing.status === "PUBLISHED" && pageHasBlocks(existing.blocks)) {
    return { updated: false };
  }

  const blocks: Prisma.InputJsonValue = pageHasBlocks(existing.blocks)
    ? (existing.blocks as Prisma.InputJsonValue)
    : HOME_LANDING_BLOCKS;

  await tx.cmsPage.update({
    where: { slug: "home" },
    data: {
      status: "PUBLISHED",
      publishedAt: existing.publishedAt ?? now,
      blocks,
    },
  });
  return { updated: true };
}

/** Ensures wired CMS pages and locale config exist after setup (blank or demo). */
export async function ensureBaselineCmsAndLocales(tx: Tx): Promise<void> {
  const startedAt = Date.now();
  let pageIndex = 0;

  for (const page of CMS_PAGE_SEEDS) {
    if (page.slug === "home") continue;

    await tx.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        titleEn: page.titleEn,
        titleAr: page.titleAr,
        excerptEn: "",
        excerptAr: "",
        templateKey: page.templateKey,
        status: "DRAFT",
        blocks: EMPTY_BLOCKS,
      },
    });
    pageIndex += 1;
  }

  await ensurePublishedHomePage(tx);
  pageIndex += 1;

  const { debugIngest } = await import("@/lib/debug-ingest");
  debugIngest(
    "ensure-baseline-cms.ts:cms-pages-done",
    "CMS page upserts finished",
    { pageCount: pageIndex, elapsedMs: Date.now() - startedAt },
    "H3",
  );

  for (const locale of LOCALE_SEEDS) {
    await tx.localeConfig.upsert({
      where: { code: locale.code },
      update: {
        urlPrefix: locale.urlPrefix,
        label: locale.label,
        htmlLang: locale.htmlLang,
        dir: locale.dir,
        flag: locale.flag,
        dateLocale: locale.dateLocale,
        currency: locale.currency,
        numberLocale: locale.numberLocale,
        isEnabled: locale.isEnabled,
        isDefault: locale.isDefault,
        sortOrder: locale.sortOrder,
      },
      create: locale,
    });
  }

  for (const locale of ["en", "ar"] as const) {
    await tx.custom404.upsert({
      where: { locale },
      update: {},
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
}
