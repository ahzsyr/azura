import type { Prisma, PrismaClient } from "@prisma/client";
import { BUILTIN_PAGE_TEMPLATE_BLOCKS } from "@/features/builder/builtin-page-template-blocks";
import { fillEmptyMainMenu, mergeWorkspaceImport } from "@/features/navigation/defaults";
import type { HeaderWorkspace } from "@/features/navigation/types";

const HEADER_WORKSPACE_NS = "header-workspace";
const HEADER_WORKSPACE_KEY = "default";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const EMPTY_BLOCKS: Prisma.InputJsonValue = [];

const HOME_LANDING_BLOCKS = BUILTIN_PAGE_TEMPLATE_BLOCKS.landing as unknown as Prisma.InputJsonValue;

const STARTER_HERO_TITLE = "Welcome to our website";

function pageHasBlocks(blocks: unknown): boolean {
  return Array.isArray(blocks) && blocks.length > 0;
}

/** True when blocks are empty or still the generic blank-install landing hero. */
function isStarterHomeBlocks(blocks: unknown): boolean {
  if (!pageHasBlocks(blocks)) return true;
  const hero = (
    blocks as Array<{ type?: string; props?: Record<string, unknown> }>
  ).find((block) => block?.type === "hero");
  const titleEn = hero?.props?.titleEn ?? hero?.props?.title;
  if (typeof titleEn === "string" && titleEn.trim() && titleEn !== STARTER_HERO_TITLE) {
    return false;
  }
  return true;
}

const CMS_PAGE_SEEDS = [
  { slug: "home", templateKey: "home", title: "Home" },
  { slug: "about", templateKey: "about", title: "About Us" },
  { slug: "contact", templateKey: "contact", title: "Contact" },
  { slug: "packages", templateKey: "packages", title: "Packages" },
  { slug: "gallery", templateKey: "gallery", title: "Gallery" },
  { slug: "testimonials", templateKey: "testimonials", title: "Testimonials" },
  { slug: "hotels-transport", templateKey: "hotels-transport", title: "Hotels & Transport" },
  { slug: "products", templateKey: "products", title: "Products" },
  { slug: "collections", templateKey: "collections", title: "Collections" },
  { slug: "services", templateKey: "services", title: "Services" },
  { slug: "compare", templateKey: "compare", title: "Compare" },
  { slug: "favorites", templateKey: "favorites", title: "Favorites" },
  { slug: "account", templateKey: "account", title: "Account" },
  { slug: "smart-home", templateKey: "smart-home", title: "Smart Home" },
  { slug: "security-solutions", templateKey: "security-solutions", title: "Security Solutions" },
  { slug: "enterprise-wireless", templateKey: "enterprise-wireless", title: "Enterprise Wireless" },
] as const;

async function upsertCmsPageTitle(tx: Tx, pageId: string, title: string, localeCode = "en") {
  await tx.entityTranslation.upsert({
    where: {
      entityType_entityId_field_localeCode: {
        entityType: "CmsPage",
        entityId: pageId,
        field: "title",
        localeCode,
      },
    },
    create: {
      entityType: "CmsPage",
      entityId: pageId,
      field: "title",
      localeCode,
      value: title,
      status: "PUBLISHED",
    },
    update: { value: title, status: "PUBLISHED" },
  });
}

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
] as const;

/** Publish homepage with starter landing blocks when missing or still draft. */
export async function ensurePublishedHomePage(tx: Tx): Promise<{ updated: boolean }> {
  const now = new Date();
  const existing = await tx.cmsPage.findUnique({ where: { slug: "home" } });

  if (!existing) {
    const created = await tx.cmsPage.create({
      data: {
        slug: "home",
        templateKey: "home",
        status: "PUBLISHED",
        publishedAt: now,
        blocks: HOME_LANDING_BLOCKS,
      },
    });
    await upsertCmsPageTitle(tx, created.id, "Home");
    return { updated: true };
  }

  if (
    existing.status === "PUBLISHED" &&
    pageHasBlocks(existing.blocks) &&
    !isStarterHomeBlocks(existing.blocks)
  ) {
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

/** Seed starter header nav when the persisted workspace has an empty main menu. */
export async function ensureDefaultHeaderWorkspace(tx: Tx): Promise<{ updated: boolean }> {
  const row = await tx.jsonStore.findUnique({
    where: {
      namespace_key: { namespace: HEADER_WORKSPACE_NS, key: HEADER_WORKSPACE_KEY },
    },
  });

  const workspace = mergeWorkspaceImport((row?.data as HeaderWorkspace | null) ?? null);
  const filled = fillEmptyMainMenu(workspace);
  if (!filled) return { updated: false };

  await tx.jsonStore.upsert({
    where: {
      namespace_key: { namespace: HEADER_WORKSPACE_NS, key: HEADER_WORKSPACE_KEY },
    },
    create: {
      namespace: HEADER_WORKSPACE_NS,
      key: HEADER_WORKSPACE_KEY,
      data: filled as unknown as Prisma.InputJsonValue,
    },
    update: {
      data: filled as unknown as Prisma.InputJsonValue,
    },
  });
  return { updated: true };
}

/** Ensures wired CMS pages and locale config exist after setup (blank or demo). */
export async function ensureBaselineCmsAndLocales(tx: Tx): Promise<void> {
  let pageIndex = 0;

  for (const page of CMS_PAGE_SEEDS) {
    if (page.slug === "home") continue;

    const row = await tx.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        templateKey: page.templateKey,
        status: "DRAFT",
        blocks: EMPTY_BLOCKS,
      },
    });
    await upsertCmsPageTitle(tx, row.id, page.title);
    pageIndex += 1;
  }

  await ensurePublishedHomePage(tx);
  await ensureDefaultHeaderWorkspace(tx);
  pageIndex += 1;

  await tx.localeConfig.deleteMany({ where: { code: "ar" } });

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

  for (const locale of ["en"] as const) {
    await tx.custom404.upsert({
      where: { locale },
      update: {},
      create: {
        locale,
        blocks: EMPTY_BLOCKS,
      },
    });
  }
}
