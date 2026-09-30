/**
 * Catalog listing pages (/products, /collections) — hero + listing shell settings.
 * Stored in site.json as `catalogPageHero` and `productListingLayout`.
 */

export type CatalogHeroStyle = "minimal" | "banner" | "split";
export type CatalogSidebarMode = "drawer" | "pinned" | "auto";
export type CatalogChromeVariant = "chrome" | "tabs" | "select" | "sidebar";
export type CatalogListingViewMode = "grid" | "list" | "table";
export type CatalogListColumnsDesktop = 1 | 2 | 3;
export type CatalogListColumnsTablet = 1 | 2;

export interface CatalogPageHeroPartial {
  style?: CatalogHeroStyle;
  showEyebrow?: boolean;
  showGlow?: boolean;
  titleScale?: "sm" | "md" | "lg";
  bannerImage?: string;
}

export interface ProductListingLayoutPartial {
  sidebarMode?: CatalogSidebarMode;
  chromeVariant?: CatalogChromeVariant;
  viewModes?: CatalogListingViewMode[];
  defaultViewMode?: CatalogListingViewMode;
  heroStyle?: CatalogHeroStyle;
  showCompare?: boolean;
  /** List-view column count at desktop (≥1100px). Mobile stays 1. */
  listColumnsDesktop?: CatalogListColumnsDesktop;
  /** List-view column count at tablet (≥768px). Mobile stays 1. */
  listColumnsTablet?: CatalogListColumnsTablet;
}

export interface CatalogToolbarDockPartial {
  enabled?: boolean;
  maxWidthPx?: number;
  sizePercent?: number;
  radiusPx?: number;
  backgroundOpacity?: number;
}

export interface ResolvedCatalogToolbarDock extends Required<CatalogToolbarDockPartial> {}

export interface ResolvedCatalogPageHero extends Required<CatalogPageHeroPartial> {}

export interface ResolvedProductListingLayout extends Required<
  Omit<ProductListingLayoutPartial, "viewModes" | "defaultViewMode" | "heroStyle" | "showCompare">
> {
  viewModes: CatalogListingViewMode[];
  defaultViewMode: CatalogListingViewMode;
  heroStyle: CatalogHeroStyle;
  showCompare: boolean;
  listColumnsDesktop: CatalogListColumnsDesktop;
  listColumnsTablet: CatalogListColumnsTablet;
}

const HERO_DEFAULTS: ResolvedCatalogPageHero = {
  style: "minimal",
  showEyebrow: true,
  showGlow: true,
  titleScale: "md",
  bannerImage: "",
};

const LISTING_DEFAULTS: ResolvedProductListingLayout = {
  sidebarMode: "auto",
  chromeVariant: "chrome",
  viewModes: ["grid", "list"],
  defaultViewMode: "grid",
  heroStyle: "minimal",
  showCompare: true,
  listColumnsDesktop: 1,
  listColumnsTablet: 1,
};

const DOCK_DEFAULTS: ResolvedCatalogToolbarDock = {
  enabled: true,
  maxWidthPx: 960,
  sizePercent: 100,
  radiusPx: 18,
  backgroundOpacity: 82,
};

function isHeroStyle(v: unknown): v is CatalogHeroStyle {
  return v === "minimal" || v === "banner" || v === "split";
}
function isSidebarMode(v: unknown): v is CatalogSidebarMode {
  return v === "drawer" || v === "pinned" || v === "auto";
}
function isChromeVariant(v: unknown): v is CatalogChromeVariant {
  return v === "chrome" || v === "tabs" || v === "select" || v === "sidebar";
}
function isViewMode(v: unknown): v is CatalogListingViewMode {
  return v === "grid" || v === "list" || v === "table";
}
function coercePositiveInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

function isListColumnsDesktop(v: unknown): v is CatalogListColumnsDesktop {
  const n = coercePositiveInt(v);
  return n === 1 || n === 2 || n === 3;
}
function isListColumnsTablet(v: unknown): v is CatalogListColumnsTablet {
  const n = coercePositiveInt(v);
  return n === 1 || n === 2;
}
function isTitleScale(v: unknown): v is ResolvedCatalogPageHero["titleScale"] {
  return v === "sm" || v === "md" || v === "lg";
}

export function normalizeCatalogPageHeroPartial(raw: unknown): CatalogPageHeroPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: CatalogPageHeroPartial = {};
  if (isHeroStyle(o.style)) out.style = o.style;
  if (typeof o.showEyebrow === "boolean") out.showEyebrow = o.showEyebrow;
  if (typeof o.showGlow === "boolean") out.showGlow = o.showGlow;
  if (isTitleScale(o.titleScale)) out.titleScale = o.titleScale;
  if (typeof o.bannerImage === "string") out.bannerImage = o.bannerImage;
  return Object.keys(out).length ? out : undefined;
}

function clampNum(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeCatalogToolbarDockPartial(
  raw: unknown,
): CatalogToolbarDockPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: CatalogToolbarDockPartial = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.maxWidthPx === "number" && Number.isFinite(o.maxWidthPx)) {
    out.maxWidthPx = clampNum(Math.round(o.maxWidthPx), 480, 1200);
  }
  if (typeof o.sizePercent === "number" && Number.isFinite(o.sizePercent)) {
    out.sizePercent = clampNum(Math.round(o.sizePercent), 80, 120);
  }
  if (typeof o.radiusPx === "number" && Number.isFinite(o.radiusPx)) {
    out.radiusPx = clampNum(Math.round(o.radiusPx), 8, 28);
  }
  if (typeof o.backgroundOpacity === "number" && Number.isFinite(o.backgroundOpacity)) {
    out.backgroundOpacity = clampNum(Math.round(o.backgroundOpacity), 40, 100);
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolveCatalogToolbarDock(
  partial?: CatalogToolbarDockPartial,
): ResolvedCatalogToolbarDock {
  return { ...DOCK_DEFAULTS, ...partial };
}

export function catalogToolbarDockCssVars(
  dock: ResolvedCatalogToolbarDock,
): Record<string, string> {
  const scale = dock.sizePercent / 100;
  return {
    "--cl-dock-max-width": `${dock.maxWidthPx}px`,
    "--cl-dock-radius": `${dock.radiusPx}px`,
    "--cl-dock-bg-percent": `${dock.backgroundOpacity}%`,
    "--cl-dock-scale": String(scale),
    "--cl-dock-pad-x": `${clampNum(Math.round(0.85 * scale * 16), 10, 20) / 16}rem`,
    "--cl-dock-pad-y": `${clampNum(Math.round(0.65 * scale * 16), 8, 16) / 16}rem`,
    "--cl-dock-control-h": `${clampNum(Math.round(2.35 * scale * 16), 34, 48) / 16}rem`,
    "--cl-dock-bottom-space": `${clampNum(Math.round(7.5 * scale * 16), 120, 140) / 16}rem`,
  };
}

export function normalizeProductListingLayoutPartial(
  raw: unknown,
): ProductListingLayoutPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductListingLayoutPartial = {};
  if (isSidebarMode(o.sidebarMode)) out.sidebarMode = o.sidebarMode;
  if (isChromeVariant(o.chromeVariant)) out.chromeVariant = o.chromeVariant;
  if (Array.isArray(o.viewModes)) {
    const modes = o.viewModes.filter(isViewMode);
    if (modes.length) out.viewModes = modes;
  }
  if (isViewMode(o.defaultViewMode)) out.defaultViewMode = o.defaultViewMode;
  if (isHeroStyle(o.heroStyle)) out.heroStyle = o.heroStyle;
  if (typeof o.showCompare === "boolean") out.showCompare = o.showCompare;
  if (isListColumnsDesktop(o.listColumnsDesktop)) {
    out.listColumnsDesktop = coercePositiveInt(o.listColumnsDesktop) as CatalogListColumnsDesktop;
  }
  if (isListColumnsTablet(o.listColumnsTablet)) {
    out.listColumnsTablet = coercePositiveInt(o.listColumnsTablet) as CatalogListColumnsTablet;
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolveCatalogPageHero(
  partial?: CatalogPageHeroPartial,
): ResolvedCatalogPageHero {
  return { ...HERO_DEFAULTS, ...partial };
}

export function resolveProductListingLayout(
  partial?: ProductListingLayoutPartial,
): ResolvedProductListingLayout {
  const base = { ...LISTING_DEFAULTS, ...partial };
  const viewModes =
    partial?.viewModes?.length && partial.viewModes.every(isViewMode)
      ? [...partial.viewModes]
      : LISTING_DEFAULTS.viewModes;
  const defaultViewMode =
    partial?.defaultViewMode && viewModes.includes(partial.defaultViewMode)
      ? partial.defaultViewMode
      : (viewModes[0] ?? "grid");
  const listColumnsDesktop = isListColumnsDesktop(partial?.listColumnsDesktop)
    ? (coercePositiveInt(partial!.listColumnsDesktop) as CatalogListColumnsDesktop)
    : LISTING_DEFAULTS.listColumnsDesktop;
  const listColumnsTablet = isListColumnsTablet(partial?.listColumnsTablet)
    ? (coercePositiveInt(partial!.listColumnsTablet) as CatalogListColumnsTablet)
    : LISTING_DEFAULTS.listColumnsTablet;
  return {
    ...base,
    viewModes,
    defaultViewMode,
    listColumnsDesktop,
    listColumnsTablet,
  };
}

export function productListingListColumnsCssVars(
  layout: Pick<ResolvedProductListingLayout, "listColumnsDesktop" | "listColumnsTablet">,
): Record<string, string> {
  return {
    "--pl-list-cols-desktop": String(layout.listColumnsDesktop),
    "--pl-list-cols-tablet": String(layout.listColumnsTablet),
  };
}

export function catalogPageHeroCssVars(hero: ResolvedCatalogPageHero): Record<string, string> {
  const scale =
    hero.titleScale === "sm"
      ? "clamp(1.25rem, 2.5vw, 1.65rem)"
      : hero.titleScale === "lg"
        ? "clamp(1.75rem, 4vw, 2.65rem)"
        : "clamp(1.5rem, 3.2vw, 2.15rem)";
  return {
    "--catalog-hero-title-size": scale,
  };
}

export function resolvePageListingLayout(
  siteLayout: ResolvedProductListingLayout,
  pagePartial?: ProductListingLayoutPartial | null,
): ResolvedProductListingLayout {
  if (!pagePartial) return siteLayout;
  return resolveProductListingLayout({ ...siteLayout, ...pagePartial });
}
