/**
 * Header Builder workspace types — adapted from project-c for Devi travel CMS.
 */

export type MenuItemType =
  | "link"
  | "page"
  | "collection"
  | "product"
  | "package"
  | "packageCategory"
  | "post"
  | "image";

export type MenuPlacement = "desktop" | "mobile" | "both";

export type GlobalApply = "none" | "Both" | "Mobile" | "Desktop";

export type HeaderStyle = "normal-compact" | "normal-minimal" | "boxed-compact" | "boxed-minimal";

export type HeaderBorderRadius = "none" | "sm" | "md" | "lg" | "xl";

/** Mega menu, dropdown, and mobile panel surface (inherits header overlay when unset) */
export type MenuSurfaceStyle = "transparent" | "glass" | "solid";

export type MenuBlurStrength = "light" | "medium" | "strong";

export type MenuShadowStyle = "none" | "soft" | "strong";

/** Shared open/close animation for desktop mega/dropdown and mobile panels */
export type MenuPanelAnimation = "fade" | "slide" | "scale";

export type MenuLayoutType = "grid" | "mixed" | "columns" | "tabbed" | "dropdown";

export type HeaderDesktopMode =
  | "static"
  | "sticky"
  | "fixed-top"
  | "hide-reveal"
  | "shrink-scroll"
  | "absolute";

export interface MegaMenuTabConfig {
  id: string;
  label: string;
  childIds: string[];
}

export interface MegaMenuPanelCopy {
  title?: string;
  body?: string;
  icon?: string;
}

export interface MegaMenuContentConfig {
  gridColumns?: number;
  columnCount?: number;
  mixed?: {
    left?: MegaMenuPanelCopy;
    right?: MegaMenuPanelCopy;
  };
  tabs?: MegaMenuTabConfig[];
  dropdownShowIcons?: boolean;
  childDescriptions?: Record<string, string>;
}

export type MobileNavType =
  | "hamburger"
  | "bottom"
  | "fullscreen"
  | "accordion"
  | "tabs"
  | "search";

export type MobileNavStyle = "minimal" | "card" | "divider" | "bordered";
export type MobileNavAnimation = "slide" | "fade" | "scale" | "spring";
export type MobileNavDensity = "compact" | "comfortable" | "spacious";
export type MobileNavSubmenuBehavior = "expand" | "slide";

export interface MenuItem {
  id: string;
  type: MenuItemType;
  label: string;
  /** Per-locale labels; `label` remains the English/default display fallback */
  labels?: Record<string, string>;
  icon?: string;
  placement: MenuPlacement;
  children: MenuItem[];
  megaMenuType?: MenuLayoutType;
  megaMenu?: MegaMenuContentConfig;
  url?: string;
  pageId?: string;
  collectionId?: string;
  productId?: string;
  packageId?: string;
  packageCategoryId?: string;
  postId?: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface MenuRecord {
  name: string;
  items: MenuItem[];
  globalApply: GlobalApply;
}

export type BrandLayoutBreakpoint = "logo-only" | "text-only" | "logo-and-text";

export type BrandFontSource = "heading" | "body" | "custom";

export interface BrandLogoSizing {
  mode: "fixed" | "adaptive";
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  adaptiveMin: number;
  adaptiveMax: number;
}

export interface BrandNameTypography {
  fontSource: BrandFontSource;
  customFont?: string;
  sizeMobile: string;
  sizeDesktop: string;
  fontWeight: 600 | 700 | 800;
}

export interface BrandTaglineTypography {
  fontSource: BrandFontSource;
  customFont?: string;
  sizeMobile: string;
  sizeDesktop: string;
  fontWeight: 400 | 500 | 600;
}

export interface BrandingState {
  logoMode: "text" | "image";
  logoText: string;
  logoImageUrl?: string;
  logoImageLightUrl: string;
  logoImageDarkUrl: string;
  brandName: string;
  tagline: string;
  showTagline: boolean;
  areaStyle: "default" | "soft" | "outline";
  brandLayoutMobile: BrandLayoutBreakpoint;
  brandLayoutDesktop: BrandLayoutBreakpoint;
  logoSizing: BrandLogoSizing;
  brandNameTypography: BrandNameTypography;
  brandTaglineTypography: BrandTaglineTypography;
}

export type HeaderActionType = "search" | "language" | "account" | "custom";

export type ActionStyle = "icon" | "solid" | "outline" | "ghost";

export interface HeaderAction {
  id: string;
  type: HeaderActionType;
  label: string;
  icon: string;
  style: ActionStyle;
  outlined: boolean;
  visible: boolean;
}

/** Site-wide: display boxed header over the first block on CMS pages */
export type HeaderFirstBlockOverlaySettings = {
  enabled?: boolean;
  contentInset?: "auto" | "custom";
  paddingTop?: string;
};

export type ResolvedHeaderOverlay = {
  enabled: boolean;
  surface: "transparent" | "glass" | "solid";
  contentInset?: "auto" | "custom";
  paddingTop?: string;
};

export interface HeaderBuilderSettings {
  headerStyle: HeaderStyle;
  headerBorderRadius?: HeaderBorderRadius;
  menuType: MenuLayoutType;
  mobileType: MobileNavType;
  headerDesktopMode: HeaderDesktopMode;
  mobileNavStyle?: MobileNavStyle;
  mobileNavAnimation?: MobileNavAnimation;
  mobileNavDensity?: MobileNavDensity;
  mobileNavSubmenuBehavior?: MobileNavSubmenuBehavior;
  mobileNavShowIcons?: boolean;
  mobileNavShowArrows?: boolean;
  overlayMode?: "none" | "over-media" | "transparent-until-scroll";
  overlaySurface?: "glass" | "solid" | "transparent";
  firstBlockHeaderOverlay?: HeaderFirstBlockOverlaySettings;
  /** Mega/dropdown/mobile panel surface; defaults to `overlaySurface` or glass */
  menuSurface?: MenuSurfaceStyle;
  /** Backdrop blur on glass menu panels */
  menuGlassEnabled?: boolean;
  menuBlurStrength?: MenuBlurStrength;
  /** Surface opacity (40–98) for glass/solid menu panels */
  menuTransparency?: number;
  menuShadow?: MenuShadowStyle;
  /** Desktop mega + mobile panel animation (keeps menus in sync) */
  menuPanelAnimation?: MenuPanelAnimation;
  /** Mobile-only panel surface; falls back to menuSurface → overlaySurface */
  mobileMenuSurface?: MenuSurfaceStyle;
  mobileMenuGlassEnabled?: boolean;
  mobileMenuBlurStrength?: MenuBlurStrength;
  /** Mobile panel opacity (40–98); default 96 when unset */
  mobileMenuTransparency?: number;
  mobileMenuShadow?: MenuShadowStyle;
  /** Mobile-only open/close animation; independent of desktop mega menus */
  mobileMenuAnimation?: MobileNavAnimation;
}

export interface HeaderWorkspace {
  version: 1;
  menusDatabase: Record<string, MenuRecord>;
  activeMenuKey: string;
  branding: BrandingState;
  headerActions: HeaderAction[];
  settings: HeaderBuilderSettings;
}

export interface HeaderBuilderCatalog {
  pages: { slug: string; title: string }[];
  collections: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
  posts: { slug: string; title: string }[];
}
