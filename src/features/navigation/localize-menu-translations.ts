import type { PublicLocale } from "@/i18n/locale-config";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import type { WorkspaceTranslationBundle } from "@/features/translation/workspace-translation.service";
import { resolveWorkspaceField } from "@/features/translation/workspace-translation.service";
import {
  makeHeaderActionEntityId,
  makeMegaMenuPanelEntityId,
  makeMegaMenuTabEntityId,
  makeMenuItemEntityId,
} from "@/features/translation/workspace-entity-ids";
import type {
  HeaderAction,
  HeaderWorkspace,
  MegaMenuContentConfig,
  MenuItem,
} from "./types";
import {
  collectHeaderTranslationRefs,
  collectMenuItemRefs,
  type MenuItemLike,
} from "./header-translation-refs";

export { collectHeaderTranslationRefs, collectMenuItemRefs };

function localizeMegaMenu(
  mega: MegaMenuContentConfig | undefined,
  menuKey: string,
  itemId: string,
  languageCode: string,
  enabledLocales: PublicLocale[],
  bundle: WorkspaceTranslationBundle,
  defaultCode?: string
): MegaMenuContentConfig | undefined {
  if (!mega) return mega;

  const result: MegaMenuContentConfig = { ...mega };

  if (mega.tabs?.length) {
    result.tabs = mega.tabs.map((tab) => ({
      ...tab,
      label:
        resolveWorkspaceField(
          bundle,
          "MegaMenuTab",
          makeMegaMenuTabEntityId(menuKey, itemId, tab.id),
          "label",
          languageCode,
          enabledLocales,
          defaultCode,
          tab.label
        ) || tab.label,
    }));
  }

  if (mega.mixed) {
    result.mixed = { ...mega.mixed };
    if (mega.mixed.left) {
      const panelId = makeMegaMenuPanelEntityId(menuKey, `${itemId}:left`);
      result.mixed.left = {
        ...mega.mixed.left,
        title:
          resolveWorkspaceField(
            bundle,
            "MegaMenuPanel",
            panelId,
            "title",
            languageCode,
            enabledLocales,
            defaultCode,
            mega.mixed.left.title
          ) || mega.mixed.left.title,
        body:
          resolveWorkspaceField(
            bundle,
            "MegaMenuPanel",
            panelId,
            "body",
            languageCode,
            enabledLocales,
            defaultCode,
            mega.mixed.left.body
          ) || mega.mixed.left.body,
      };
    }
    if (mega.mixed.right) {
      const panelId = makeMegaMenuPanelEntityId(menuKey, `${itemId}:right`);
      result.mixed.right = {
        ...mega.mixed.right,
        title:
          resolveWorkspaceField(
            bundle,
            "MegaMenuPanel",
            panelId,
            "title",
            languageCode,
            enabledLocales,
            defaultCode,
            mega.mixed.right.title
          ) || mega.mixed.right.title,
        body:
          resolveWorkspaceField(
            bundle,
            "MegaMenuPanel",
            panelId,
            "body",
            languageCode,
            enabledLocales,
            defaultCode,
            mega.mixed.right.body
          ) || mega.mixed.right.body,
      };
    }
  }

  if (mega.childDescriptions) {
    const desc: Record<string, string> = {};
    for (const [childId, text] of Object.entries(mega.childDescriptions)) {
      const childEntityId = makeMenuItemEntityId(menuKey, childId);
      desc[childId] =
        resolveWorkspaceField(
          bundle,
          "MenuItem",
          childEntityId,
          "cardSubtitle",
          languageCode,
          enabledLocales,
          defaultCode,
          text
        ) || text;
    }
    result.childDescriptions = desc;
  }

  return result;
}

export function localizeMenuItemWithBundle<T extends MenuItemLike>(
  item: T,
  menuKey: string,
  languageCode: string,
  enabledLocales: PublicLocale[],
  bundle: WorkspaceTranslationBundle,
  defaultCode?: string
): T {
  const entityId = makeMenuItemEntityId(menuKey, item.id);
  const label = resolveWorkspaceField(
    bundle,
    "MenuItem",
    entityId,
    "label",
    languageCode,
    enabledLocales,
    defaultCode,
    item.label
  );

  return {
    ...item,
    label,
    description:
      resolveWorkspaceField(
        bundle,
        "MenuItem",
        entityId,
        "description",
        languageCode,
        enabledLocales,
        defaultCode,
        item.description
      ) || item.description,
    cardSubtitle:
      resolveWorkspaceField(
        bundle,
        "MenuItem",
        entityId,
        "cardSubtitle",
        languageCode,
        enabledLocales,
        defaultCode,
        item.cardSubtitle
      ) || item.cardSubtitle,
    badgeText:
      resolveWorkspaceField(
        bundle,
        "MenuItem",
        entityId,
        "badgeText",
        languageCode,
        enabledLocales,
        defaultCode,
        item.badgeText
      ) || item.badgeText,
    megaMenu: localizeMegaMenu(
      item.megaMenu,
      menuKey,
      item.id,
      languageCode,
      enabledLocales,
      bundle,
      defaultCode
    ),
    children: item.children?.map((child) =>
      localizeMenuItemWithBundle(child, menuKey, languageCode, enabledLocales, bundle, defaultCode)
    ),
  };
}

export function localizeMenuTreeWithBundle<T extends MenuItemLike>(
  items: T[],
  menuKey: string,
  localePrefix: string,
  enabledLocales: PublicLocale[],
  bundle: WorkspaceTranslationBundle
): T[] {
  const languageCode = resolvePrefixToCode(localePrefix, enabledLocales);
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code;
  return items.map((item) =>
    localizeMenuItemWithBundle(item, menuKey, languageCode, enabledLocales, bundle, defaultCode)
  );
}

export function localizeHeaderActions(
  actions: HeaderAction[],
  localePrefix: string,
  enabledLocales: PublicLocale[],
  bundle: WorkspaceTranslationBundle
): HeaderAction[] {
  const languageCode = resolvePrefixToCode(localePrefix, enabledLocales);
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code;

  return actions.map((action) => ({
    ...action,
    label:
      resolveWorkspaceField(
        bundle,
        "HeaderAction",
        makeHeaderActionEntityId(action.id),
        "label",
        languageCode,
        enabledLocales,
        defaultCode,
        action.label
      ) || action.label,
  }));
}

export function localizeHeaderWorkspaceWithBundle(
  ws: HeaderWorkspace,
  localePrefix: string,
  enabledLocales: PublicLocale[],
  bundle: WorkspaceTranslationBundle
): HeaderWorkspace {
  const menusDatabase = { ...ws.menusDatabase };

  for (const [menuKey, menu] of Object.entries(menusDatabase)) {
    menusDatabase[menuKey] = {
      ...menu,
      items: localizeMenuTreeWithBundle(
        (menu.items ?? []) as MenuItem[],
        menuKey,
        localePrefix,
        enabledLocales,
        bundle
      ),
    };
  }

  return {
    ...ws,
    menusDatabase,
    headerActions: localizeHeaderActions(ws.headerActions ?? [], localePrefix, enabledLocales, bundle),
  };
}
