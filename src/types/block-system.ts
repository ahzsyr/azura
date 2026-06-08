import type { CSSProperties } from "react";
import type { BlockType } from "@/types/builder";
import type { ThemeTokens } from "@/types/theme";

/** Block system schema version */
export const BLOCK_SYSTEM_VERSION = "2.0" as const;
export const BLOCK_LEGACY_VERSION = "1.0" as const;

export type BlockSystemVersion = typeof BLOCK_SYSTEM_VERSION | typeof BLOCK_LEGACY_VERSION | string;

export type BlockCategory =
  | "layout"
  | "content"
  | "marketing"
  | "data"
  | "commerce"
  | "conversion"
  | "portal"
  | "discovery"
  | "media";

export type DeviceBreakpoint = "desktop" | "tablet" | "mobile";

export type CssLength = string | number;
export type CssColor = string;

export type WidthPreset = "full" | "fit" | "custom";
export type MaxWidthPreset = "full" | "page" | "wide" | "narrow" | "custom";
export type MinHeightPreset = "auto" | "40vh" | "50vh" | "75vh" | "screen" | "custom";
export type SectionSpacingPreset = "none" | "compact" | "default" | "large" | "custom";

/** Universal layout / typography / color / border / shadow / effects */
export type BlockLayoutStyles = {
  width?: CssLength;
  maxWidth?: CssLength;
  height?: CssLength;
  minHeight?: CssLength;
  sectionSpacing?: CssLength;
  contentSpacing?: CssLength;
  widthPreset?: WidthPreset;
  maxWidthPreset?: MaxWidthPreset;
  minHeightPreset?: MinHeightPreset;
  sectionSpacingPreset?: SectionSpacingPreset;
};

export type BlockTypographyStyles = {
  fontFamily?: string;
  fontWeight?: string | number;
  fontSize?: CssLength;
  letterSpacing?: CssLength;
  lineHeight?: CssLength | number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
};

export type BlockColorStyles = {
  backgroundColor?: CssColor;
  textColor?: CssColor;
  borderColor?: CssColor;
  hoverBackgroundColor?: CssColor;
  hoverTextColor?: CssColor;
  hoverBorderColor?: CssColor;
};

export type BlockBorderStyles = {
  borderWidth?: CssLength;
  borderRadius?: CssLength;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
};

export type BlockShadowStyles = {
  boxShadow?: string;
  textShadow?: string;
};

export type BlockEffectStyles = {
  blur?: CssLength;
  opacity?: number;
  brightness?: number;
};

export type BlockPositionStyles = {
  position?: "relative" | "absolute" | "sticky" | "fixed";
  zIndex?: number;
  overflow?: "visible" | "hidden" | "auto" | "scroll";
};

export type BlockCustomStyles = {
  className?: string;
  cssVariables?: Record<string, string>;
  inlineCss?: string;
};

export type BlockStyleSettings = BlockLayoutStyles &
  BlockTypographyStyles &
  BlockColorStyles &
  BlockBorderStyles &
  BlockShadowStyles &
  BlockEffectStyles &
  BlockPositionStyles &
  BlockCustomStyles & {
    /** Inherit from theme token keys instead of raw values */
    tokenOverrides?: Partial<{
      primaryColor: string;
      secondaryColor: string;
      bodyFont: string;
      headingFont: string;
      spacingScale: number;
    }>;
  };

export type ContentOverflowMode = "inherit" | "grid" | "slider" | "collapse";

export type CollapseVariant = "accordion" | "show_more" | "stack";

export type BlockContentOverflowSettings = {
  mode?: ContentOverflowMode;
  /** When mode is slider; false falls back to grid */
  sliderEnabled?: boolean;
  collapseVariant?: CollapseVariant;
  /** Items shown before expand when collapseVariant is show_more */
  showMoreLimit?: number;
};

/** Resolved layout after inherit cascade and base-prop mapping */
export type ResolvedContentOverflow = {
  effectiveMode: "grid" | "slider" | "collapse";
  sliderEnabled: boolean;
  collapseVariant: CollapseVariant;
  showMoreLimit: number;
};

export type BlockResponsiveOverride = Partial<BlockStyleSettings> & {
  hide?: boolean;
  grid?: {
    columns?: number;
    gap?: CssLength;
  };
  alignment?: "start" | "center" | "end" | "stretch";
  contentOverflow?: BlockContentOverflowSettings;
};

export type BlockResponsiveSettings = Partial<
  Record<DeviceBreakpoint, BlockResponsiveOverride>
>;

export type AnimationType =
  | "fade"
  | "slide"
  | "zoom"
  | "rotate"
  | "scale"
  | "bounce"
  | "none";

export type BlockAnimationPhase = {
  type?: AnimationType;
  durationMs?: number;
  delayMs?: number;
  easing?: string;
  triggerPoint?: string;
};

export type BlockAnimationSettings = {
  entrance?: BlockAnimationPhase;
  exit?: BlockAnimationPhase;
  hover?: BlockAnimationPhase;
  scroll?: BlockAnimationPhase;
  enabled?: boolean;
};

export type BlockSectionBackground = {
  type?: "none" | "color" | "gradient" | "image" | "pattern" | "particles" | "grid" | "glass";
  color?: string;
  gradient?: string;
  imageUrl?: string;
  mediaAssetId?: string;
  pattern?: string;
  overlayOpacity?: number;
  glassBlur?: string;
};

export type BlockVisualSettings = {
  siteEffects?: {
    cursor?: "inherit" | "off";
    text?: "inherit" | "off" | "custom";
  };
  textEffect?: string | null;
  headingTextEffect?: "inherit" | "none" | string;
  sectionBackground?: BlockSectionBackground;
};

export type BlockVisibilityRules = {
  loggedIn?: boolean | null;
  loggedOut?: boolean | null;
  roles?: string[];
  locales?: string[];
  languages?: string[];
  devices?: DeviceBreakpoint[];
  dateRange?: { start?: string; end?: string };
  timeRange?: { start?: string; end?: string };
  featureFlags?: string[];
  urlConditions?: {
    match?: "exact" | "prefix" | "regex";
    pattern?: string;
  }[];
};

export type BlockSeoSettings = {
  structuredData?: Record<string, unknown>;
  schemaOrgType?: string;
  canonicalOverride?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
  };
  indexing?: "index" | "noindex" | "follow" | "nofollow";
};

/** Per-locale content overrides keyed by field name */
export type BlockLocaleContent = Record<string, string>;

export type BlockLocalizationSettings = {
  /** field → locale → value */
  translations?: Record<string, BlockLocaleContent>;
  /** locale-specific style overrides */
  localeStyles?: Record<string, Partial<BlockStyleSettings>>;
  /** locale-specific visibility */
  localeVisibility?: Record<string, Partial<BlockVisibilityRules>>;
  fallbackChain?: string[];
};

/** Full block instance (v2) — same type may appear unlimited times with unique id */
export type BlockInstanceV2 = {
  id: string;
  type: BlockType;
  version: BlockSystemVersion;
  settings: Record<string, unknown>;
  styles?: BlockStyleSettings;
  responsive?: BlockResponsiveSettings;
  localization?: BlockLocalizationSettings;
  visibility?: BlockVisibilityRules;
  seo?: BlockSeoSettings;
  animation?: BlockAnimationSettings;
  visual?: BlockVisualSettings;
  /** Omitted on storefront when true; preserved in admin block list. */
  hidden?: boolean;
  children?: BlockInstanceV2[];
};

export type BlockDefinitionMeta = {
  type: BlockType;
  version: BlockSystemVersion;
  category: BlockCategory;
  name: string;
  description: string;
  icon: string;
  /** Multi-item blocks that support grid/slider/collapse overflow in Responsive tab */
  contentOverflowCapable?: boolean;
};

export type BlockDefinition<TSettings = Record<string, unknown>> = BlockDefinitionMeta & {
  defaultSettings: TSettings;
  defaultStyles?: BlockStyleSettings;
  defaultResponsive?: BlockResponsiveSettings;
  defaultAnimation?: BlockAnimationSettings;
  translatableFields: string[];
  /** Lazy component name for dynamic import map */
  componentKey: string;
};

export type BlockRenderContext = {
  locale: string;
  device: DeviceBreakpoint;
  theme?: ThemeTokens;
  siteTextEffect?: string | null;
  pageAnimationsEnabled?: boolean;
  isLoggedIn?: boolean;
  userRoles?: string[];
  currentPath?: string;
  featureFlags?: string[];
  now?: Date;
  /** When true, hidden blocks still render in builder previews. */
  previewMode?: boolean;
};

export type ResolvedBlockStyles = {
  className: string;
  style: CSSProperties;
  dataAttributes: Record<string, string>;
  hidden: boolean;
};
