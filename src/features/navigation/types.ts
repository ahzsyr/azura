/**
 * Header Builder workspace types for the travel CMS.
 */

export type MenuItemType =
  | "link"
  | "page"
  | "collection"
  | "brand"
  | "tag"
  | "product"
  | "package"
  | "packageCategory"
  | "post"
  | "image";

export type MenuPlacement = "desktop" | "mobile" | "both";
export type MenuItemVisibility = "visible" | "hidden" | "draft" | "scheduled";

export type GlobalApply = "none" | "Both" | "Mobile" | "Desktop";

export type HeaderStyle = "normal-compact" | "normal-minimal" | "boxed-compact" | "boxed-minimal";

export type HeaderBorderRadius = "none" | "sm" | "md" | "lg" | "xl";

/** Mega menu, dropdown, and mobile panel surface (inherits header overlay when unset) */
export type MenuSurfaceStyle = "transparent" | "glass" | "solid";

export type MenuBlurStrength = "light" | "medium" | "strong";

export type MenuShadowStyle = "none" | "soft" | "strong";

/** Shared open/close animation for desktop mega/dropdown and mobile panels */
export type MenuPanelAnimation = "fade" | "slide" | "scale";

export type MenuLayoutType =
  | "grid"
  | "mixed"
  | "columns"
  | "tabbed"
  | "dropdown"
  | "icon"
  | "sidebar"
  | "panel";

/** Fixed Icon Layout column counts (1–12). Use `"auto"` for responsive fill. */
export type MegaMenuIconLayoutColumns = "auto" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Parent-scoped Icon Layout flyout settings (children remain ordinary MenuItems). */
export interface MegaMenuIconLayoutConfig {
  iconSize?: "sm" | "md" | "lg";
  /** `"auto"` or 1–12 fixed columns. */
  columns?: MegaMenuIconLayoutColumns;
  alignment?: "start" | "center" | "end";
  iconPosition?: "top" | "left";
  showDescriptions?: boolean;
  showBadges?: boolean;
  spacing?: "compact" | "comfortable" | "spacious";
}

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

/** v2 panel layouts (sidebar / panel megaMenuType). */
export type MegaMenuPanelLayout =
  | "links"
  | "cards"
  | "featured"
  | "columns"
  | "iconGrid"
  | "productGrid"
  | "mixed";

export type MegaMenuSurfaceWidth = "auto" | "container" | "wide" | "full";
export type MegaMenuSurfaceAlignment = "left" | "center" | "right";
export type MegaMenuPanelGap = "sm" | "md" | "lg";

export type MegaMenuChildDisplayType =
  | "automatic"
  | "link"
  | "card"
  | "featured"
  | "icon"
  | "product";

export interface MegaMenuNavItem {
  id: string;
  label: string;
  panelId: string;
  icon?: string;
}

export interface MegaMenuNavigationConfig {
  enabled: boolean;
  width?: number;
  items: MegaMenuNavItem[];
}

export interface MegaMenuColumnGroup {
  id: string;
  heading: string;
  childIds: string[];
  ctaLabel?: string;
  ctaChildId?: string;
}

export interface MegaMenuPanelFeaturedConfig {
  childId?: string;
  ctaLabel?: string;
}

export interface MegaMenuPanelCarouselConfig {
  enabled: boolean;
  arrows?: boolean;
  autoplay?: boolean;
}

/** Optional catalog auto-source (Phase 4). Persist source, not duplicated children. */
export interface MegaMenuPanelSourceConfig {
  type: "collectionChildren";
  collectionId: string;
}

export interface MegaMenuPanelConfig {
  id: string;
  label?: string;
  layout: MegaMenuPanelLayout;
  columns?: number;
  gap?: MegaMenuPanelGap;
  childIds: string[];
  featured?: MegaMenuPanelFeaturedConfig;
  carousel?: MegaMenuPanelCarouselConfig;
  columnGroups?: MegaMenuColumnGroup[];
  source?: MegaMenuPanelSourceConfig;
}

export interface MegaMenuContentConfig {
  /** Explicit v2 gate. Never infer v2 from megaMenuType alone. */
  version?: 1 | 2;
  gridColumns?: number;
  columnCount?: number;
  mixed?: {
    left?: MegaMenuPanelCopy;
    right?: MegaMenuPanelCopy;
  };
  tabs?: MegaMenuTabConfig[];
  dropdownShowIcons?: boolean;
  childDescriptions?: Record<string, string>;
  /** v2: per-child CTA label (Learn More, View All, Compare All, etc.) */
  childCtaLabels?: Record<string, string>;
  /** Parent-only Icon Layout options when megaMenuType is "icon". */
  iconLayout?: MegaMenuIconLayoutConfig;

  /**
   * Desktop mega menu sizing controls.
   * Defaults are additive (when unset, existing CSS/layout behavior remains).
   */
  width?: "auto" | "sm" | "md" | "lg" | "xl" | "full" | "custom";
  customWidth?: number | null;

  height?: "auto" | "sm" | "md" | "lg" | "xl" | "custom";
  customHeight?: number | null;

  /** v2: left rail navigation (sidebar). */
  navigation?: MegaMenuNavigationConfig;
  /** v2: content panels referencing parent.children via childIds. */
  panels?: MegaMenuPanelConfig[];
  /** v2: shell surface width. */
  surfaceWidth?: MegaMenuSurfaceWidth;
  /** v2: shell content alignment. */
  alignment?: MegaMenuSurfaceAlignment;
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
  icon?: string;
  placement: MenuPlacement;
  children: MenuItem[];
  megaMenuType?: MenuLayoutType;
  megaMenu?: MegaMenuContentConfig;
  /**
   * Controls how this item is rendered inside its parent mega menu on desktop.
   * When unset, falls back to existing automatic visual-card detection.
   */
  megaMenuChildDisplayType?: MegaMenuChildDisplayType;
  url?: string;
  pageId?: string;
  collectionId?: string;
  brandSlug?: string;
  tagSlug?: string;
  productId?: string;
  packageId?: string;
  packageCategoryId?: string;
  postId?: string;
  imageUrl?: string;
  linkUrl?: string;
  /** Builder visibility lifecycle; hidden/draft items are excluded from live nav rendering. */
  visibility?: MenuItemVisibility;
  /** Optional schedule start (ISO string) used when visibility = scheduled. */
  scheduledAt?: string;
  /** Audience targeting reserved for future personalization rules. */
  audience?: "all" | "authenticated" | "guest";
  /** Optional role slugs for audience = authenticated. */
  roles?: string[];
  badgeText?: string;
  highlight?: boolean;
  customClass?: string;
  openInNewTab?: boolean;
  noFollow?: boolean;
  customTarget?: string;
  localizedUrls?: Record<string, string>;
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
  /** Link destination for custom buttons (internal path or external URL). */
  href?: string;
}

/** Site-wide preference: display header over media underlays (hero/banner/cover) */
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
  /** Tablet drawer icons (641–968px). Unset falls back to `mobileNavShowIcons`. */
  tabletNavShowIcons?: boolean;
  /** Desktop main-nav / mega icons (≥969px). */
  desktopNavShowIcons?: boolean;
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
  /**
   * When desktop sticky + boxed: keep boxed card sticky on mobile.
   * Default false = full-bleed flush bar (when auto-remove is on).
   */
  mobileBoxedSticky?: boolean;
  /**
   * When mobile boxed header is off: auto-remove the top floating gap.
   * Default true. Ignored while boxed mobile header is on (gap is kept).
   */
  mobileFlushTop?: boolean;
}

export interface HeaderWorkspace {
  version: 1;
  menusDatabase: Record<string, MenuRecord>;
  activeMenuKey: string;
  branding: BrandingState;
  headerActions: HeaderAction[];
  settings: HeaderBuilderSettings;
}

export interface HeaderBuilderCatalogPage {
  slug: string;
  title: string;
  status?: "DRAFT" | "PUBLISHED";
  kind?: "wired" | "cms";
}

export interface HeaderBuilderCatalogCollection {
  slug: string;
  name: string;
  parentSlug?: string;
}

export interface HeaderBuilderContentTypeMeta {
  slug: string;
  name: string;
  routePrefix: string | null;
}

/** Cascade tree node for Page → section → type → item. */
export interface SourceFamilyNode {
  id: string;
  label: string;
  children?: SourceFamilyNode[];
  /** Present on leaf nodes under a section. */
  leafKind?:
    | "pages"
    | "posts"
    | "products"
    | "packages"
    | "offerings"
    | "listings"
    | "collections"
    | "brands"
    | "tags"
    | "contentType"
    | "sitePage";
  contentTypeSlug?: string;
  routePrefix?: string;
  sitePageSlug?: string;
}

export interface HeaderBuilderCatalog {
  pages: HeaderBuilderCatalogPage[];
  collections: HeaderBuilderCatalogCollection[];
  brands: { slug: string; name: string; logoUrl?: string }[];
  tags: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
  posts: { slug: string; title: string }[];
  /** Published content items keyed by ContentType.slug */
  contentByType: Record<string, { slug: string; name: string }[]>;
  contentTypes: HeaderBuilderContentTypeMeta[];
  sourceFamilies: SourceFamilyNode[];
}
