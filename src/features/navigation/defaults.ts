import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SHORT,
  DEFAULT_TAGLINE,
  isDefaultBrandName,
} from "@/config/site";
import type { BrandingState, HeaderAction, HeaderDesktopMode, HeaderWorkspace, MenuItem, MenuItemType } from "./types";
import { normalizeBranding } from "./branding-defaults";
import { generateId } from "./menu-engine";

const HEADER_DESKTOP_MODES: readonly HeaderDesktopMode[] = [
  "static",
  "sticky",
  "fixed-top",
  "hide-reveal",
  "shrink-scroll",
  "absolute",
] as const;

function normalizeHeaderSettings(settings: HeaderWorkspace["settings"]): HeaderWorkspace["settings"] {
  const mode = settings.headerDesktopMode;
  if (mode && HEADER_DESKTOP_MODES.includes(mode)) return settings;
  return { ...settings, headerDesktopMode: "sticky" };
}

const LEGACY_MENU_ITEM_ID = /^devi-nav-/;

function defaultMenuLink(id: string, label: string, url: string, labelAr: string): MenuItem {
  return {
    id,
    type: "link",
    label,
    labels: { en: label, ar: labelAr },
    placement: "both",
    children: [],
    url,
  };
}

/** Starter nav for blank installs — customize in Header → Menu builder. */
function buildDefaultMainMenuItems(): MenuItem[] {
  return [
    defaultMenuLink("nav-home", "Home", "/", "الرئيسية"),
    defaultMenuLink("nav-about", "About", "/about", "من نحن"),
    defaultMenuLink("nav-packages", "Packages", "/packages", "الباقات"),
    defaultMenuLink("nav-products", "Products", "/products", "المنتجات"),
    defaultMenuLink("nav-services", "Services", "/services", "الخدمات"),
    defaultMenuLink("nav-contact", "Contact", "/contact", "اتصل بنا"),
  ];
}

function isLegacyMainMenuItems(items: MenuItem[]): boolean {
  if (items.some((item) => LEGACY_MENU_ITEM_ID.test(item.id))) return true;
  const legacyPaths = new Set(["/packages", "/visa", "/hotels-transport"]);
  const legacyMatches = items.filter(
    (item) => item.type === "link" && legacyPaths.has((item.url ?? "").trim()),
  ).length;
  return legacyMatches >= 2;
}

/** True when workspace branding is an old template seed that should be reset to factory defaults. */
function isLegacyHeaderBranding(branding: HeaderWorkspace["branding"]): boolean {
  const name = (branding.brandName ?? "").trim();
  const logo = (branding.logoText ?? "").trim();
  const tag = (branding.tagline ?? "").trim();
  if (name === "AZURA" && tag.toLowerCase() === "solutions") return true;
  if (logo === "AZ" && name === "AZURA" && tag.toLowerCase() === "solutions") return true;
  if (name === "SAFEER MEDINA") return true;
  return false;
}

function isOverridableBrandName(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  return (
    n === DEFAULT_BRAND_NAME ||
    n === "AZURA" ||
    n === "AZURA Solutions" ||
    n === DEFAULT_BRAND_SHORT
  );
}

function isOverridableTagline(tagline: string): boolean {
  const t = tagline.trim();
  if (!t) return true;
  return t.toLowerCase() === "solutions";
}

const FACTORY_BRANDING = normalizeBranding({});

/** True when theme brandConfig has any non-factory branding field (layout, typography, logos, etc.). */
function themeBrandConfigIsCustomized(branding: BrandingState): boolean {
  if (!isDefaultBrandName(branding.brandName) && branding.brandName !== FACTORY_BRANDING.brandName) {
    return true;
  }
  if (branding.logoImageLightUrl || branding.logoImageDarkUrl) return true;
  if (branding.logoMode !== FACTORY_BRANDING.logoMode) return true;
  if (branding.tagline.trim()) return true;
  if (branding.brandLayoutMobile !== FACTORY_BRANDING.brandLayoutMobile) return true;
  if (branding.brandLayoutDesktop !== FACTORY_BRANDING.brandLayoutDesktop) return true;
  if (branding.areaStyle !== FACTORY_BRANDING.areaStyle) return true;
  if (branding.showTagline !== FACTORY_BRANDING.showTagline) return true;
  if (
    branding.logoText !== FACTORY_BRANDING.logoText &&
    !isOverridableBrandName(branding.logoText)
  ) {
    return true;
  }
  return (
    JSON.stringify(branding.logoSizing) !== JSON.stringify(FACTORY_BRANDING.logoSizing) ||
    JSON.stringify(branding.brandNameTypography) !==
      JSON.stringify(FACTORY_BRANDING.brandNameTypography) ||
    JSON.stringify(branding.brandTaglineTypography) !==
      JSON.stringify(FACTORY_BRANDING.brandTaglineTypography)
  );
}

/** Upgrade persisted workspaces from BRT / travel-agency template seeds. */
export function migrateLegacyHeaderWorkspace(workspace: HeaderWorkspace): HeaderWorkspace | null {
  const factory = createDefaultWorkspace();
  let branding = workspace.branding;
  let menusDatabase = workspace.menusDatabase;
  let changed = false;

  if (isLegacyHeaderBranding(workspace.branding)) {
    branding = factory.branding;
    changed = true;
  }

  const mainMenu = workspace.menusDatabase.mainMenu;
  if (mainMenu && isLegacyMainMenuItems(mainMenu.items)) {
    menusDatabase = {
      ...workspace.menusDatabase,
      mainMenu: { ...mainMenu, items: factory.menusDatabase.mainMenu.items },
    };
    changed = true;
  }

  if (!changed) return null;
  return { ...workspace, branding, menusDatabase };
}

export function buildDefaultHeaderActions(): HeaderAction[] {
  return [
    {
      id: "action-search",
      type: "search",
      label: "Search",
      icon: "fa-search",
      style: "icon",
      outlined: false,
      visible: true,
    },
    {
      id: "action-account",
      type: "account",
      label: "Account",
      icon: "fa-user",
      style: "icon",
      outlined: false,
      visible: true,
    },
    {
      id: "action-cta",
      type: "custom",
      label: "Inquire",
      icon: "fa-envelope",
      style: "solid",
      outlined: false,
      visible: true,
      href: "/contact",
    },
  ];
}

/** Inject account action and hide language in header bar (language lives in personalization widget). */
export function migrateHeaderActions(actions: HeaderAction[]): HeaderAction[] {
  let result = actions.map((a) =>
    a.type === "language" ? { ...a, visible: false } : a,
  );

  const hasAccount = result.some((a) => a.type === "account" || a.id === "action-account");
  if (!hasAccount) {
    const accountAction: HeaderAction = {
      id: "action-account",
      type: "account",
      label: "Account",
      icon: "fa-user",
      style: "icon",
      outlined: false,
      visible: true,
    };
    const searchIdx = result.findIndex((a) => a.type === "search");
    if (searchIdx >= 0) {
      result = [
        ...result.slice(0, searchIdx + 1),
        accountAction,
        ...result.slice(searchIdx + 1),
      ];
    } else {
      result = [accountAction, ...result];
    }
  }

  result = result.map((a) => {
    if (a.type === "custom" && a.id === "action-cta" && !a.href?.trim()) {
      return { ...a, href: "/contact" };
    }
    return a;
  });

  return result;
}

/** Fill an empty main menu with starter links (blank DB seeds). */
export function fillEmptyMainMenu(workspace: HeaderWorkspace): HeaderWorkspace | null {
  const items = workspace.menusDatabase.mainMenu?.items ?? [];
  if (items.length > 0) return null;
  const factory = createDefaultWorkspace();
  return {
    ...workspace,
    menusDatabase: {
      ...workspace.menusDatabase,
      mainMenu: {
        ...workspace.menusDatabase.mainMenu,
        items: factory.menusDatabase.mainMenu.items,
      },
    },
  };
}

export function createDefaultWorkspace(): HeaderWorkspace {
  return {
    version: 1,
    menusDatabase: {
      mainMenu: { name: "Main Menu", items: buildDefaultMainMenuItems(), globalApply: "Both" },
    },
    activeMenuKey: "mainMenu",
    branding: normalizeBranding({
      logoMode: "text",
      logoText: DEFAULT_BRAND_SHORT,
      logoImageLightUrl: "",
      logoImageDarkUrl: "",
      brandName: DEFAULT_BRAND_NAME,
      tagline: DEFAULT_TAGLINE,
      showTagline: Boolean(DEFAULT_TAGLINE.trim()),
      areaStyle: "default",
      brandLayoutMobile: "logo-and-text",
      brandLayoutDesktop: "logo-and-text",
    }),
    headerActions: buildDefaultHeaderActions(),
    settings: {
      headerStyle: "normal-compact",
      headerBorderRadius: "lg",
      menuType: "dropdown",
      mobileType: "hamburger",
      headerDesktopMode: "sticky",
      overlayMode: "none",
      overlaySurface: "glass",
      firstBlockHeaderOverlay: { enabled: false, contentInset: "auto" },
      menuGlassEnabled: true,
      menuBlurStrength: "medium",
      menuTransparency: 92,
      menuShadow: "strong",
      menuPanelAnimation: "slide",
      mobileMenuSurface: "glass",
      mobileMenuGlassEnabled: true,
      mobileMenuBlurStrength: "medium",
      mobileMenuTransparency: 96,
      mobileMenuShadow: "strong",
      mobileMenuAnimation: "slide",
    },
  };
}

export function mergeWorkspaceImport(raw: unknown): HeaderWorkspace {
  const base = createDefaultWorkspace();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  let menus = base.menusDatabase;
  if (o.menusDatabase && typeof o.menusDatabase === "object") {
    menus = { ...menus, ...(o.menusDatabase as HeaderWorkspace["menusDatabase"]) };
  }

  let branding = base.branding;
  if (o.brandingState && typeof o.brandingState === "object") {
    branding = { ...branding, ...(o.brandingState as typeof branding) };
  } else if (o.branding && typeof o.branding === "object") {
    branding = { ...branding, ...(o.branding as typeof branding) };
  }
  if (!branding.logoImageLightUrl && branding.logoImageUrl) {
    branding = { ...branding, logoImageLightUrl: branding.logoImageUrl };
  }
  branding = normalizeBranding(branding);

  let headerActions = base.headerActions;
  if (Array.isArray(o.headerActions)) {
    headerActions = migrateHeaderActions(o.headerActions as HeaderAction[]);
  } else {
    headerActions = migrateHeaderActions(headerActions);
  }

  const activeMenuKey =
    typeof o.activeMenuKey === "string" && menus[o.activeMenuKey] ? o.activeMenuKey : base.activeMenuKey;

  let settings = { ...base.settings };
  if (o.settings && typeof o.settings === "object") {
    settings = { ...settings, ...(o.settings as typeof settings) };
  }
  settings = normalizeHeaderSettings(settings);

  const merged: HeaderWorkspace = {
    version: 1,
    menusDatabase: menus,
    activeMenuKey,
    branding,
    headerActions,
    settings,
  };

  return migrateLegacyHeaderWorkspace(merged) ?? merged;
}

export function newMenuItemFromForm(input: {
  type: MenuItemType;
  label: string;
  icon?: string;
  placement: MenuItem["placement"];
  url?: string;
  pageId?: string;
  collectionId?: string;
  productId?: string;
  packageId?: string;
  packageCategoryId?: string;
  postId?: string;
  imageUrl?: string;
  linkUrl?: string;
}): MenuItem {
  const id = generateId();
  const base: MenuItem = {
    id,
    type: input.type,
    label: input.label,
    placement: input.placement,
    children: [],
  };
  const icon = input.icon?.trim();
  if (icon) base.icon = icon;
  if (input.type === "link") base.url = input.url ?? "#";
  else if (input.type === "page") base.pageId = input.pageId ?? "home";
  else if (input.type === "collection" || input.type === "packageCategory") {
    base.collectionId = input.collectionId ?? input.packageCategoryId ?? "standard";
    base.packageCategoryId = input.packageCategoryId ?? input.collectionId ?? "standard";
  } else if (input.type === "product" || input.type === "package") {
    base.productId = input.productId ?? input.packageId;
    base.packageId = input.packageId ?? input.productId;
  } else if (input.type === "post") base.postId = input.postId ?? "";
  else if (input.type === "image") {
    base.imageUrl = input.imageUrl ?? "";
    base.linkUrl = input.linkUrl ?? "#";
  }
  return base;
}

export function mergeHeaderWorkspaceWithTheme(
  workspace: HeaderWorkspace,
  theme: {
    logoUrl?: string | null;
    brandConfig?: Partial<import("./types").BrandingState>;
    siteName?: string;
    tagline?: string;
  },
): HeaderWorkspace {
  const logo = typeof theme.logoUrl === "string" ? theme.logoUrl.trim() : "";
  const themeBranding = theme.brandConfig ? normalizeBranding(theme.brandConfig) : null;
  const useThemeBranding = themeBranding && themeBrandConfigIsCustomized(themeBranding);

  let branding = useThemeBranding
    ? normalizeBranding(theme.brandConfig!)
    : normalizeBranding({ ...workspace.branding });

  const name = typeof theme.siteName === "string" ? theme.siteName.trim() : "";
  const siteTag = typeof theme.tagline === "string" ? theme.tagline.trim() : "";
  const savedName = (branding.brandName ?? "").trim();
  const savedTag = (branding.tagline ?? "").trim();
  const savedLogo = (branding.logoText ?? "").trim();

  if (name && isOverridableBrandName(savedName)) {
    branding = { ...branding, brandName: name };
  }
  if (siteTag && isOverridableTagline(savedTag)) {
    branding = { ...branding, tagline: siteTag, showTagline: true };
  }
  if (
    name &&
    (!savedLogo ||
      isOverridableBrandName(savedLogo) ||
      savedLogo === savedName ||
      savedLogo === DEFAULT_BRAND_SHORT)
  ) {
    const short =
      themeBranding?.logoText?.trim() ||
      (name.length <= 6 ? name : name.split(/\s+/).map((w) => w[0]).join("").slice(0, 4).toUpperCase());
    if (short && short !== name) {
      branding = { ...branding, logoText: short };
    }
  }
  if (logo && !branding.logoImageLightUrl && !branding.logoImageDarkUrl) {
    branding = {
      ...branding,
      logoMode: "image",
      logoImageLightUrl: logo,
      logoImageDarkUrl: logo,
    };
  }

  return { ...workspace, branding };
}
