import type { Prisma, PrismaClient } from "@prisma/client";
import { fillEmptyMainMenu, mergeWorkspaceImport } from "@/features/navigation/defaults";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { compositionService } from "@/features/layout-engine/composition.service";

const HEADER_WORKSPACE_NS = "header-workspace";
const HEADER_WORKSPACE_KEY = "default";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const EMPTY_BLOCKS: Prisma.InputJsonValue = [];
const EMPTY_COMPOSITION = compositionService.save(compositionService.createEmpty()).composition;

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
    htmlLang: "en-US",
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
  // Select scalars only — loading invalid blocks/composition JSON throws in Prisma.
  const existing = await tx.cmsPage.findUnique({
    where: { slug: "home" },
    select: { id: true, status: true, publishedAt: true },
  });

  if (!existing) {
    const created = await tx.cmsPage.create({
      data: {
        slug: "home",
        templateKey: "home",
        status: "PUBLISHED",
        publishedAt: now,
        blocks: EMPTY_BLOCKS,
        composition: EMPTY_COMPOSITION,
      },
      select: { id: true },
    });
    await upsertCmsPageTitle(tx, created.id, "Home");
    return { updated: true };
  }

  if (existing.status === "PUBLISHED" && existing.publishedAt) {
    return { updated: false };
  }

  await tx.cmsPage.update({
    where: { slug: "home" },
    data: {
      status: "PUBLISHED",
      publishedAt: existing.publishedAt ?? now,
      blocks: EMPTY_BLOCKS,
      composition: EMPTY_COMPOSITION,
    },
  });
  return { updated: true };
}

/** Seed starter header nav when the persisted workspace has an empty main menu. */
export async function ensureDefaultHeaderWorkspace(tx: Tx): Promise<{ updated: boolean }> {
  let existingData: HeaderWorkspace | null = null;
  try {
    const row = await tx.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: HEADER_WORKSPACE_NS, key: HEADER_WORKSPACE_KEY },
      },
      select: { data: true },
    });
    existingData = (row?.data as HeaderWorkspace | null) ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Unexpected end of JSON input|invalid json|Malformed JSON/i.test(message)) {
      throw error;
    }
    // Corrupt JsonStore.data — replace with a fresh workspace below.
    existingData = null;
  }

  const workspace = mergeWorkspaceImport(existingData);
  const filled = fillEmptyMainMenu(workspace);
  if (!filled && existingData) return { updated: false };

  const next = filled ?? workspace;
  await tx.jsonStore.upsert({
    where: {
      namespace_key: { namespace: HEADER_WORKSPACE_NS, key: HEADER_WORKSPACE_KEY },
    },
    create: {
      namespace: HEADER_WORKSPACE_NS,
      key: HEADER_WORKSPACE_KEY,
      data: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      data: next as unknown as Prisma.InputJsonValue,
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
        composition: EMPTY_COMPOSITION,
      },
      select: { id: true },
    });
    await upsertCmsPageTitle(tx, row.id, page.title);
    pageIndex += 1;
  }

  await ensurePublishedHomePage(tx);
  await ensureDefaultHeaderWorkspace(tx);
  pageIndex += 1;

  // English is the base locale; other locales are added per deployment.
  await tx.localeConfig.deleteMany({
    where: { code: { not: "en" }, isDefault: false },
  });

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
