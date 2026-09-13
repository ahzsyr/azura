/**
 * Backfill EntityTranslation from JSON workspaces, block props, and form templates.
 * Run: npm run i18n:backfill:workspace
 */
import { PrismaClient } from "@prisma/client";
import {
  extractTranslationsFromBlocks,
  type BlockParentType,
} from "../../src/features/translation/block-translation";
import {
  makeFooterColumnEntityId,
  makeFooterEntityId,
  makeFooterLinkEntityId,
  makeFormFieldEntityId,
  makeFormStepEntityId,
  makeHeaderActionEntityId,
  makeMegaMenuPanelEntityId,
  makeMegaMenuTabEntityId,
  makeMenuItemEntityId,
} from "../../src/features/translation/workspace-entity-ids";
import type { PageBlocks } from "../../src/types/builder";
import type { PublicLocale } from "../../src/i18n/locale-config";
import { upsertEntityTranslation } from "./migration-utils";

const prisma = new PrismaClient();

type MenuItemLike = {
  id: string;
  label?: string;
  labels?: Record<string, string>;
  description?: string;
  cardSubtitle?: string;
  badgeText?: string;
  megaMenu?: {
    tabs?: { id: string; label?: string }[];
    mixed?: {
      left?: { title?: string; body?: string };
      right?: { title?: string; body?: string };
    };
    childDescriptions?: Record<string, string>;
  };
  children?: MenuItemLike[];
};

function walkMenuItems(items: MenuItemLike[]): MenuItemLike[] {
  const out: MenuItemLike[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) out.push(...walkMenuItems(item.children));
  }
  return out;
}

async function backfillHeaderWorkspace(locales: PublicLocale[]): Promise<number> {
  const header = await prisma.jsonStore.findFirst({
    where: { namespace: "header-workspace", key: "default" },
  });
  if (!header?.data || typeof header.data !== "object") return 0;

  let count = 0;
  const ws = header.data as {
    menusDatabase?: Record<string, { items?: MenuItemLike[] }>;
    headerActions?: { id: string; label?: string }[];
  };

  async function upsertField(
    entityType: string,
    entityId: string,
    field: string,
    value: string
  ) {
    if (!value.trim()) return;
    for (const locale of locales) {
      await upsertEntityTranslation(prisma, {
        entityType,
        entityId,
        field,
        localeCode: locale.code,
        value: value.trim(),
      });
      count++;
    }
  }

  for (const [menuKey, menu] of Object.entries(ws.menusDatabase ?? {})) {
    for (const item of walkMenuItems(menu.items ?? [])) {
      const entityId = makeMenuItemEntityId(menuKey, item.id);
      const labelSources: Record<string, string> = { ...(item.labels ?? {}) };
      if (item.label?.trim() && !labelSources.en) labelSources.en = item.label.trim();

      for (const locale of locales) {
        const code = locale.code.toLowerCase();
        const value =
          labelSources[code] ??
          labelSources[locale.urlPrefix] ??
          (locale.isDefault ? item.label?.trim() : "") ??
          "";
        if (!value.trim()) continue;
        await upsertEntityTranslation(prisma, {
          entityType: "MenuItem",
          entityId,
          field: "label",
          localeCode: locale.code,
          value: value.trim(),
        });
        count++;
      }

      await upsertField("MenuItem", entityId, "description", item.description ?? "");
      await upsertField("MenuItem", entityId, "cardSubtitle", item.cardSubtitle ?? "");
      await upsertField("MenuItem", entityId, "badgeText", item.badgeText ?? "");

      for (const [childId, text] of Object.entries(item.megaMenu?.childDescriptions ?? {})) {
        await upsertField(
          "MenuItem",
          makeMenuItemEntityId(menuKey, childId),
          "cardSubtitle",
          text
        );
      }

      for (const tab of item.megaMenu?.tabs ?? []) {
        await upsertField(
          "MegaMenuTab",
          makeMegaMenuTabEntityId(menuKey, item.id, tab.id),
          "label",
          tab.label ?? ""
        );
      }

      const left = item.megaMenu?.mixed?.left;
      if (left) {
        const panelId = makeMegaMenuPanelEntityId(menuKey, `${item.id}:left`);
        await upsertField("MegaMenuPanel", panelId, "title", left.title ?? "");
        await upsertField("MegaMenuPanel", panelId, "body", left.body ?? "");
      }

      const right = item.megaMenu?.mixed?.right;
      if (right) {
        const panelId = makeMegaMenuPanelEntityId(menuKey, `${item.id}:right`);
        await upsertField("MegaMenuPanel", panelId, "title", right.title ?? "");
        await upsertField("MegaMenuPanel", panelId, "body", right.body ?? "");
      }
    }
  }

  for (const action of ws.headerActions ?? []) {
    await upsertField(
      "HeaderAction",
      makeHeaderActionEntityId(action.id),
      "label",
      action.label ?? ""
    );
  }

  console.log(`  Header workspace: ${count} translation rows upserted`);
  return count;
}

async function backfillFooterWorkspace(locales: PublicLocale[]): Promise<number> {
  const footer = await prisma.jsonStore.findFirst({
    where: { namespace: "footer-workspace", key: "default" },
  });
  if (!footer?.data || typeof footer.data !== "object") return 0;

  let count = 0;
  const ws = footer.data as {
    columns?: {
      id: string;
      title?: string;
      body?: string;
      links?: { label?: string; href?: string }[];
    }[];
    copyright?: { rightsText?: string; suffix?: string };
  };

  for (const col of ws.columns ?? []) {
    const entityId = makeFooterColumnEntityId(col.id);
    if (col.title?.trim()) {
      for (const locale of locales) {
        await upsertEntityTranslation(prisma, {
          entityType: "FooterColumn",
          entityId,
          field: "heading",
          localeCode: locale.code,
          value: col.title.trim(),
        });
        count++;
      }
    }
    if (col.body?.trim()) {
      for (const locale of locales) {
        await upsertEntityTranslation(prisma, {
          entityType: "FooterColumn",
          entityId,
          field: "body",
          localeCode: locale.code,
          value: col.body.trim(),
        });
        count++;
      }
    }
    for (const [linkIndex, link] of (col.links ?? []).entries()) {
      const linkId = makeFooterLinkEntityId(col.id, String(linkIndex));
      if (link.label?.trim()) {
        for (const locale of locales) {
          await upsertEntityTranslation(prisma, {
            entityType: "FooterLink",
            entityId: linkId,
            field: "label",
            localeCode: locale.code,
            value: link.label.trim(),
          });
          count++;
        }
      }
    }
  }

  const footerEntityId = makeFooterEntityId();
  if (ws.copyright?.rightsText?.trim()) {
    for (const locale of locales) {
      await upsertEntityTranslation(prisma, {
        entityType: "Footer",
        entityId: footerEntityId,
        field: "copyrightText",
        localeCode: locale.code,
        value: ws.copyright.rightsText.trim(),
      });
      count++;
    }
  }
  console.log(`  Footer workspace: ${count} translation rows upserted`);
  return count;
}

async function backfillBlocks(locales: PublicLocale[]): Promise<number> {
  let count = 0;

  async function processParent(
    parentType: BlockParentType,
    parentId: string,
    blocks: unknown
  ) {
    const pageBlocks = (Array.isArray(blocks) ? blocks : []) as PageBlocks;
    if (pageBlocks.length === 0) return;
    const inputs = extractTranslationsFromBlocks(pageBlocks, parentType, parentId, locales);
    for (const input of inputs) {
      await upsertEntityTranslation(prisma, input);
      count++;
    }
  }

  const pages = await prisma.cmsPage.findMany({ select: { id: true, blocks: true } });
  for (const page of pages) await processParent("CmsPage", page.id, page.blocks);

  const posts = await prisma.post.findMany({ select: { id: true, blocks: true } });
  for (const post of posts) await processParent("Post", post.id, post.blocks);

  const items = await prisma.contentItem.findMany({ select: { id: true, blocks: true } });
  for (const item of items) await processParent("ContentItem", item.id, item.blocks);

  console.log(`  BuilderBlock: ${count} translation rows upserted`);
  return count;
}

async function backfillFormTemplates(locales: PublicLocale[]): Promise<number> {
  let count = 0;
  const templates = await prisma.formTemplate.findMany({ select: { id: true, definition: true } });

  for (const tpl of templates) {
    const def = tpl.definition as {
      fields?: {
        id: string;
        labelEn?: string;
        labelAr?: string;
        placeholderEn?: string;
        placeholderAr?: string;
      }[];
      steps?: { id: string; titleEn?: string; titleAr?: string }[];
    };

    for (const field of def.fields ?? []) {
      const entityId = makeFormFieldEntityId(tpl.id, field.id);
      const labelMap: Record<string, string> = {};
      if (field.labelEn?.trim()) labelMap.en = field.labelEn.trim();
      if (field.labelAr?.trim()) labelMap.ar = field.labelAr.trim();

      for (const locale of locales) {
        const code = locale.code.toLowerCase();
        const label =
          labelMap[code] ??
          labelMap[locale.urlPrefix] ??
          (locale.isDefault ? field.labelEn?.trim() : "") ??
          "";
        if (label) {
          await upsertEntityTranslation(prisma, {
            entityType: "FormField",
            entityId,
            field: "label",
            localeCode: locale.code,
            value: label,
          });
          count++;
        }
        const placeholder =
          (code === "ar" ? field.placeholderAr : field.placeholderEn)?.trim() ?? "";
        if (placeholder) {
          await upsertEntityTranslation(prisma, {
            entityType: "FormField",
            entityId,
            field: "placeholder",
            localeCode: locale.code,
            value: placeholder,
          });
          count++;
        }
      }
    }

    for (const step of def.steps ?? []) {
      const entityId = makeFormStepEntityId(tpl.id, step.id);
      for (const locale of locales) {
        const title =
          (locale.code.toLowerCase() === "ar" ? step.titleAr : step.titleEn)?.trim() ??
          step.titleEn?.trim() ??
          "";
        if (!title) continue;
        await upsertEntityTranslation(prisma, {
          entityType: "FormStep",
          entityId,
          field: "title",
          localeCode: locale.code,
          value: title,
        });
        count++;
      }
    }
  }
  console.log(`  Form templates: ${count} translation rows upserted`);
  return count;
}

async function main() {
  console.log("Backfilling workspace / block / form translations...\n");

  const localeRows = await prisma.localeConfig.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  const locales: PublicLocale[] = localeRows.map((l) => ({
    code: l.code,
    urlPrefix: l.urlPrefix,
    label: l.label,
    htmlLang: l.htmlLang,
    dir: l.dir === "rtl" ? "rtl" : "ltr",
    flag: l.flag,
    isDefault: l.isDefault,
  }));

  if (locales.length === 0) {
    console.error("No enabled locales in LocaleConfig");
    process.exit(1);
  }

  let total = 0;
  total += await backfillHeaderWorkspace(locales);
  total += await backfillFooterWorkspace(locales);
  total += await backfillBlocks(locales);
  total += await backfillFormTemplates(locales);

  console.log(`\nDone. ${total} translation rows upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
