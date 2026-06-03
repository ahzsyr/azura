import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SHORT,
  DEFAULT_TAGLINE,
  isDefaultBrandName,
} from "@/config/site";
import type { HeaderDesktopMode, HeaderWorkspace, MenuItem, MenuItemType } from "./types";
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

/** Seed nav from Devi's original hardcoded header links. */
function buildDeviMainMenuItems(): MenuItem[] {
  const staticNav: { href: string; key: string; label: string }[] = [
    { href: "/", key: "home", label: "Home" },
    { href: "/about", key: "about", label: "About" },
    { href: "/packages", key: "packages", label: "Packages" },
    { href: "/visa", key: "visa", label: "Visa" },
    { href: "/hotels-transport", key: "hotels", label: "Hotels & Transport" },
    { href: "/gallery", key: "gallery", label: "Gallery" },
    { href: "/testimonials", key: "testimonials", label: "Testimonials" },
    { href: "/contact", key: "contact", label: "Contact" },
  ];

  return staticNav.map((item) => ({
    id: `devi-nav-${item.key}`,
    type: "link" as const,
    label: item.label,
    url: item.href,
    icon: undefined,
    placement: "both" as const,
    children: [],
  }));
}

export function buildDefaultHeaderActions() {
  return [
    {
      id: "action-search",
      type: "search" as const,
      label: "Search",
      icon: "fa-search",
      style: "icon" as const,
      outlined: false,
      visible: true,
    },
    {
      id: "action-language",
      type: "language" as const,
      label: "EN",
      icon: "fa-globe",
      style: "ghost" as const,
      outlined: false,
      visible: true,
    },
    {
      id: "action-cta",
      type: "custom" as const,
      label: "Inquire",
      icon: "fa-envelope",
      style: "solid" as const,
      outlined: false,
      visible: true,
    },
  ];
}

export function createDefaultWorkspace(): HeaderWorkspace {
  return {
    version: 1,
    menusDatabase: {
      mainMenu: { name: "Main Menu", items: buildDeviMainMenuItems(), globalApply: "Both" },
    },
    activeMenuKey: "mainMenu",
    branding: normalizeBranding({
      logoMode: "text",
      logoText: DEFAULT_BRAND_SHORT,
      logoImageLightUrl: "",
      logoImageDarkUrl: "",
      brandName: DEFAULT_BRAND_NAME,
      tagline: DEFAULT_TAGLINE,
      showTagline: true,
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
    headerActions = o.headerActions as typeof headerActions;
  }

  const activeMenuKey =
    typeof o.activeMenuKey === "string" && menus[o.activeMenuKey] ? o.activeMenuKey : base.activeMenuKey;

  let settings = { ...base.settings };
  if (o.settings && typeof o.settings === "object") {
    settings = { ...settings, ...(o.settings as typeof settings) };
  }
  settings = normalizeHeaderSettings(settings);

  return {
    version: 1,
    menusDatabase: menus,
    activeMenuKey,
    branding,
    headerActions,
    settings,
  };
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
  const hasThemeBranding =
    themeBranding &&
    (!isDefaultBrandName(themeBranding.brandName) ||
      themeBranding.logoImageLightUrl ||
      themeBranding.logoImageDarkUrl ||
      themeBranding.logoMode === "image" ||
      themeBranding.tagline.trim());

  let branding = hasThemeBranding
    ? themeBranding
    : normalizeBranding({ ...workspace.branding });

  const name = typeof theme.siteName === "string" ? theme.siteName.trim() : "";
  const siteTag = typeof theme.tagline === "string" ? theme.tagline.trim() : "";
  const savedName = (branding.brandName ?? "").trim();
  const savedTag = (branding.tagline ?? "").trim();
  if (name && !savedName) branding = { ...branding, brandName: name };
  if (siteTag && !savedTag) {
    branding = { ...branding, tagline: siteTag, showTagline: true };
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
