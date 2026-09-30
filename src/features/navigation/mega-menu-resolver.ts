import type {
  MegaMenuChildDisplayType,
  MegaMenuContentConfig,
  MegaMenuNavItem,
  MegaMenuPanelConfig,
  MegaMenuPanelLayout,
  MegaMenuSurfaceAlignment,
  MegaMenuSurfaceWidth,
  MenuItem,
  MenuItemType,
  MenuLayoutType,
} from "./types";
import { getEffectiveMegaMenuType, getItemHref } from "./resolve-href";
import { isValidMegaMenuV2 } from "./mega-menu-validate";
import { clampMegaColumns } from "./mega-menu-form";

export type ResolvedMegaMenuChildDisplayType = "card" | "link";

export type MegaMenuEffectiveDisplayType = "link" | "card" | "featured" | "icon" | "product";

export type MegaMenuWidth =
  | "auto"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full"
  | "custom";

export type MegaMenuHeight = "auto" | "sm" | "md" | "lg" | "xl" | "custom";

const MEGA_MENU_WIDTHS: Record<Exclude<MegaMenuWidth, "auto">, string> = {
  sm: "640px",
  md: "768px",
  lg: "960px",
  xl: "1200px",
  // Keep "full" aligned with the existing header container/parity (mega-inner already centers).
  full: "var(--site-page-max-width)",
  custom: "var(--mega-menu-custom-width, auto)",
};

const MEGA_MENU_HEIGHTS: Record<Exclude<MegaMenuHeight, "auto" | "custom">, string> = {
  sm: "280px",
  md: "360px",
  lg: "480px",
  xl: "560px",
};

const SURFACE_WIDTH_CSS: Record<MegaMenuSurfaceWidth, string> = {
  auto: "auto",
  container: "var(--site-page-max-width, 1200px)",
  wide: "min(1400px, calc(100vw - 2rem))",
  full: "100%",
};

const MAX_CUSTOM_WIDTH_PX = 2000;
const MAX_CUSTOM_HEIGHT_PX = 1200;

function clampPositiveInt(value: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, max);
}

export type ResolvedMegaMenuConfig = {
  type: MenuLayoutType;
  cssVariables: {
    "--mega-menu-width"?: string;
    "--mega-menu-max-height": string; // use "none" when unset to keep CSS simple
    "--mega-menu-overflow-y": "visible" | "auto";
  };
};

export type MegaMenuChildViewModel = {
  id: string;
  href: string;
  label: string;
  displayType: MegaMenuEffectiveDisplayType;
  image?: string;
  icon?: string;
  subtitle?: string;
  badge?: string;
  ctaLabel?: string;
  child: MenuItem;
};

export type MegaMenuColumnGroupViewModel = {
  id: string;
  heading: string;
  children: MegaMenuChildViewModel[];
  ctaLabel?: string;
  ctaHref?: string;
};

export type MegaMenuPanelViewModel = {
  id: string;
  label?: string;
  layout: MegaMenuPanelLayout;
  columns: number;
  gap: "sm" | "md" | "lg";
  children: MegaMenuChildViewModel[];
  featured?: MegaMenuChildViewModel | null;
  featuredCtaLabel?: string;
  carousel?: { enabled: boolean; arrows: boolean; autoplay: boolean };
  columnGroups?: MegaMenuColumnGroupViewModel[];
  source?: MegaMenuPanelConfig["source"];
};

export type MegaMenuNavViewModel = MegaMenuNavItem & {
  isActive?: boolean;
};

export type MegaMenuViewModel = {
  type: MenuLayoutType;
  isV2: boolean;
  surface: {
    surfaceWidth: MegaMenuSurfaceWidth;
    alignment: MegaMenuSurfaceAlignment;
  };
  navigation: {
    enabled: boolean;
    width: number;
    items: MegaMenuNavViewModel[];
  } | null;
  panels: MegaMenuPanelViewModel[];
  activePanelId: string | null;
  cssVars: Record<string, string>;
  children: MegaMenuChildViewModel[];
};

function resolveWidth(mega?: MegaMenuContentConfig): string | undefined {
  const w = mega?.width;
  if (!w || w === "auto") return undefined;
  if (w === "custom") return undefined; // JS sets custom var separately below
  return MEGA_MENU_WIDTHS[w as Exclude<MegaMenuWidth, "auto" | "custom">];
}

function resolveMaxHeight(mega?: MegaMenuContentConfig): string | null {
  const h = mega?.height;
  if (!h || h === "auto") return null;
  if (h === "custom") return null; // JS sets via customHeight below
  return MEGA_MENU_HEIGHTS[h as Exclude<MegaMenuHeight, "auto" | "custom">];
}

export function resolveMegaMenuConfig(item: MenuItem, menuTypeOverride?: MenuLayoutType): ResolvedMegaMenuConfig {
  const resolvedType = menuTypeOverride ?? getEffectiveMegaMenuType(item);
  const mega = item.megaMenu;

  const widthPreset = resolveWidth(mega);
  const maxHeightPreset = resolveMaxHeight(mega);

  const isAutoHeight = !mega?.height || mega.height === "auto";
  const customHeight = mega?.customHeight ?? null;
  const customWidth = mega?.customWidth ?? null;

  const clampedCustomWidth = typeof customWidth === "number" ? clampPositiveInt(customWidth, MAX_CUSTOM_WIDTH_PX) : null;
  const clampedCustomHeight = typeof customHeight === "number" ? clampPositiveInt(customHeight, MAX_CUSTOM_HEIGHT_PX) : null;

  let megaMenuWidth: string | undefined = widthPreset;
  if (mega?.width === "custom") {
    megaMenuWidth = clampedCustomWidth != null ? `${clampedCustomWidth}px` : undefined;
  }

  let maxHeight: string | null = maxHeightPreset;
  if (mega?.height === "custom") {
    maxHeight = clampedCustomHeight != null ? `${clampedCustomHeight}px` : null;
  }

  // "auto" means no forced height; for CSS we represent this as max-height: none.
  const maxHeightCss = isAutoHeight || maxHeight == null ? "none" : maxHeight;
  const overflowY: "visible" | "auto" = maxHeightCss === "none" ? "visible" : "auto";

  return {
    type: resolvedType,
    cssVariables: {
      "--mega-menu-width": megaMenuWidth,
      "--mega-menu-max-height": maxHeightCss,
      "--mega-menu-overflow-y": overflowY,
    },
  };
}

function isVisualCardType(type: MenuItemType): boolean {
  return (
    type === "collection" ||
    type === "packageCategory" ||
    type === "brand" ||
    type === "product" ||
    type === "package" ||
    type === "image"
  );
}

function isVisualCardThumbnail(type: MenuItemType, imageUrl?: string | null): boolean {
  if (!imageUrl?.trim()) return false;
  return isVisualCardType(type);
}

function shouldUseVisualCardForAutomatic(child: { type: MenuItemType; imageUrl?: string | null }, menuType: MenuLayoutType): boolean {
  // Preserve existing behavior:
  // - grid: visual card if the type is visual-card-friendly (even without imageUrl; placeholder will show)
  // - other layouts: visual card only when imageUrl is present AND type is visual-card-friendly
  if (menuType === "grid") return isVisualCardType(child.type);
  return isVisualCardThumbnail(child.type, child.imageUrl);
}

/** v1 helper — card | link only (legacy Surface). */
export function resolveMegaMenuChildDisplayType(
  child: MenuItem,
  menuType: MenuLayoutType,
): ResolvedMegaMenuChildDisplayType {
  const explicit = child.megaMenuChildDisplayType;
  if (explicit === "card" || explicit === "featured" || explicit === "product" || explicit === "icon") {
    return "card";
  }
  if (explicit === "link") return "link";

  return shouldUseVisualCardForAutomatic(child, menuType) ? "card" : "link";
}

const PANEL_DEFAULT_DISPLAY: Record<MegaMenuPanelLayout, MegaMenuEffectiveDisplayType> = {
  links: "link",
  columns: "link",
  cards: "card",
  featured: "featured",
  iconGrid: "icon",
  productGrid: "product",
  mixed: "card",
};

const VALID_EXPLICIT_FOR_LAYOUT: Record<MegaMenuPanelLayout, ReadonlySet<MegaMenuEffectiveDisplayType>> = {
  links: new Set(["link", "card"]),
  columns: new Set(["link", "card"]),
  cards: new Set(["card", "link", "featured", "icon", "product"]),
  featured: new Set(["featured", "card", "product", "link"]),
  iconGrid: new Set(["icon", "card", "link"]),
  productGrid: new Set(["product", "card", "featured", "link"]),
  mixed: new Set(["card", "featured", "product", "link", "icon"]),
};

export function resolveEffectiveChildDisplayType(
  child: MenuItem,
  panelLayout: MegaMenuPanelLayout | null,
  legacyMenuType?: MenuLayoutType,
): MegaMenuEffectiveDisplayType {
  const explicit = child.megaMenuChildDisplayType as MegaMenuChildDisplayType | undefined;

  if (!panelLayout) {
    // v1 path
    const legacy = resolveMegaMenuChildDisplayType(child, legacyMenuType ?? "dropdown");
    return legacy;
  }

  const automatic = PANEL_DEFAULT_DISPLAY[panelLayout];
  if (!explicit || explicit === "automatic") {
    if (panelLayout === "productGrid" && child.type === "product") return "product";
    if (panelLayout === "iconGrid") return "icon";
    if (automatic === "card" && !shouldUseVisualCardForAutomatic(child, "grid") && !child.imageUrl) {
      // Prefer link when no visual affordance for link-like types in card panels
      if (!isVisualCardType(child.type) && !child.icon) return "link";
    }
    return automatic;
  }

  const mapped: MegaMenuEffectiveDisplayType =
    explicit === "link" ||
    explicit === "card" ||
    explicit === "featured" ||
    explicit === "icon" ||
    explicit === "product"
      ? explicit
      : automatic;

  if (VALID_EXPLICIT_FOR_LAYOUT[panelLayout].has(mapped)) return mapped;
  return automatic;
}

function buildChildViewModel(
  child: MenuItem,
  localeCode: string,
  panelLayout: MegaMenuPanelLayout | null,
  mega?: MegaMenuContentConfig,
  legacyMenuType?: MenuLayoutType,
): MegaMenuChildViewModel {
  const displayType = resolveEffectiveChildDisplayType(child, panelLayout, legacyMenuType);
  const subtitle =
    mega?.childDescriptions?.[child.id]?.trim() ||
    undefined;
  const ctaLabel =
    mega?.childCtaLabels?.[child.id]?.trim() ||
    undefined;
  return {
    id: child.id,
    href: getItemHref(child, localeCode),
    label: child.label,
    displayType,
    image: child.imageUrl?.trim() || undefined,
    icon: child.icon?.trim() || undefined,
    subtitle,
    badge: child.badgeText?.trim() || undefined,
    ctaLabel,
    child,
  };
}

/**
 * Central normalization for mega menus.
 * v2 only when version === 2 AND structural validation passes.
 */
export function resolveMegaMenu(
  item: MenuItem,
  localeCode: string,
  menuTypeOverride?: MenuLayoutType,
): MegaMenuViewModel {
  const type = menuTypeOverride ?? getEffectiveMegaMenuType(item);
  const mega = item.megaMenu;
  const legacyResolved = resolveMegaMenuConfig(item, type);
  const isV2 = isValidMegaMenuV2(item, mega);

  const allChildren = (item.children ?? []).map((c) =>
    buildChildViewModel(c, localeCode, null, mega, type),
  );

  const surfaceWidth: MegaMenuSurfaceWidth = mega?.surfaceWidth ?? "container";
  const alignment: MegaMenuSurfaceAlignment = mega?.alignment ?? "center";

  const cssVars: Record<string, string> = {
    "--mega-menu-max-height": legacyResolved.cssVariables["--mega-menu-max-height"],
    "--mega-menu-overflow-y": legacyResolved.cssVariables["--mega-menu-overflow-y"],
  };
  if (legacyResolved.cssVariables["--mega-menu-width"]) {
    cssVars["--mega-menu-width"] = legacyResolved.cssVariables["--mega-menu-width"];
  }

  if (!isV2 || !mega) {
    return {
      type,
      isV2: false,
      surface: { surfaceWidth: "auto", alignment: "center" },
      navigation: null,
      panels: [],
      activePanelId: null,
      cssVars,
      children: allChildren,
    };
  }

  const childById = new Map((item.children ?? []).map((c) => [c.id, c]));
  const panels: MegaMenuPanelViewModel[] = (mega.panels ?? []).map((panel) => {
    const panelChildren = (panel.childIds ?? [])
      .map((id) => childById.get(id))
      .filter((c): c is MenuItem => Boolean(c))
      .map((c) => buildChildViewModel(c, localeCode, panel.layout, mega, type));

    let featured: MegaMenuChildViewModel | null = null;
    if (panel.featured?.childId) {
      const fc = childById.get(panel.featured.childId);
      if (fc) {
        featured = buildChildViewModel(fc, localeCode, "featured", mega, type);
        if (panel.featured.ctaLabel?.trim()) {
          featured = { ...featured, ctaLabel: panel.featured.ctaLabel.trim() };
        }
      }
    }

    const columnGroups = panel.columnGroups?.map((g) => {
      const groupChildren = (g.childIds ?? [])
        .map((id) => childById.get(id))
        .filter((c): c is MenuItem => Boolean(c))
        .map((c) => buildChildViewModel(c, localeCode, "columns", mega, type));
      const ctaChild = g.ctaChildId ? childById.get(g.ctaChildId) : undefined;
      return {
        id: g.id,
        heading: g.heading,
        children: groupChildren,
        ctaLabel: g.ctaLabel?.trim() || undefined,
        ctaHref: ctaChild ? getItemHref(ctaChild, localeCode) : undefined,
      };
    });

    return {
      id: panel.id,
      label: panel.label,
      layout: panel.layout,
      columns: clampMegaColumns(panel.columns ?? 4),
      gap: panel.gap ?? "md",
      children: panelChildren,
      featured,
      featuredCtaLabel: panel.featured?.ctaLabel?.trim() || undefined,
      carousel: panel.carousel?.enabled
        ? {
            enabled: true,
            arrows: panel.carousel.arrows !== false,
            autoplay: panel.carousel.autoplay === true,
          }
        : undefined,
      columnGroups,
      source: panel.source,
    };
  });

  const navEnabled = type === "sidebar" && mega.navigation?.enabled === true;
  const navWidth = typeof mega.navigation?.width === "number" ? mega.navigation.width : 220;
  const navItems: MegaMenuNavViewModel[] = navEnabled
    ? (mega.navigation?.items ?? []).map((n) => ({ ...n }))
    : [];

  const activePanelId =
    (navItems[0]?.panelId && panels.some((p) => p.id === navItems[0].panelId)
      ? navItems[0].panelId
      : panels[0]?.id) ?? null;

  cssVars["--mega-menu-rail-width"] = `${navWidth}px`;
  cssVars["--mega-menu-surface-width"] = SURFACE_WIDTH_CSS[surfaceWidth];
  cssVars["--mega-menu-content-width"] =
    surfaceWidth === "full" ? SURFACE_WIDTH_CSS.container : SURFACE_WIDTH_CSS[surfaceWidth];

  return {
    type,
    isV2: true,
    surface: { surfaceWidth, alignment },
    navigation: navEnabled
      ? { enabled: true, width: navWidth, items: navItems }
      : type === "panel"
        ? null
        : mega.navigation
          ? { enabled: false, width: navWidth, items: [] }
          : null,
    panels,
    activePanelId,
    cssVars,
    children: allChildren,
  };
}
