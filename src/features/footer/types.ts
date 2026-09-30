import type { FooterSectionType } from "./sections/types";

export type { FooterSectionType };
export { FOOTER_SECTION_TYPES } from "./sections/types";

/** @deprecated Use FooterSectionType */
export type FooterColumnType = FooterSectionType;

export type FooterMenuSource = "custom" | "header" | "footer" | "category" | "collection";

export type FooterSocialSource = "company" | "custom";
export type FooterSocialStyle = "icons" | "text" | "icons-text";
export type FooterSocialSize = "sm" | "md" | "lg";
export type FooterSocialLayout = "horizontal" | "vertical";

export type FooterLayout = "grid" | "centered";

export type FooterLinkStyle = "default" | "muted" | "underline";

export type FooterHeadingStyle = "uppercase" | "normal";

export type FooterColumnGap = "tight" | "normal" | "loose";

export type FooterBorderStyle = "subtle" | "accent" | "none";

export type FooterBackground = "light" | "dark" | "accent" | "inherit";

export type FooterTextTone = "light" | "dark" | "muted";

export type FooterPadding = "small" | "medium" | "large";

export type FooterDivider = "none" | "top" | "full";

export type FooterContainerWidth = "default" | "narrow" | "full";

export type FooterAlignment = "start" | "center" | "end";

export interface FooterLink {
  label: string;
  href: string;
  openInNewTab?: boolean;
}

export interface FooterColumn {
  id: string;
  type: FooterSectionType;
  enabled?: boolean;
  title?: string;
  menuSource?: FooterMenuSource;
  headerMenuKey?: string;
  links?: FooterLink[];
  body?: string;
  showSocial?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showAddress?: boolean;
  /** Pin section to an explicit layout column (1-based). Omit for auto-placement by array order. */
  columnSlot?: 1 | 2 | 3 | 4;
  /** Hide this section on tablet viewports. */
  hiddenOnTablet?: boolean;
  /** Hide this section on mobile viewports. */
  hiddenOnMobile?: boolean;
  // ── Social section settings ──────────────────────────────
  /** "company" pulls social links from company settings; "custom" uses the links array. */
  socialSource?: FooterSocialSource;
  /** Whether to show icons, text labels, or both. */
  socialStyle?: FooterSocialStyle;
  /** Icon size for social icons. */
  socialIconSize?: FooterSocialSize;
  /** Stacking direction of social items. */
  socialLayout?: FooterSocialLayout;
}

export interface FooterCopyright {
  showBar?: boolean;
  rightsText?: string;
  suffix?: string;
  legalLinks?: FooterLink[];
}

export interface FooterDesign {
  linkStyle?: FooterLinkStyle;
  headingStyle?: FooterHeadingStyle;
  columnGap?: FooterColumnGap;
  borderStyle?: FooterBorderStyle;
  background?: FooterBackground;
  textTone?: FooterTextTone;
  padding?: FooterPadding;
  divider?: FooterDivider;
  containerWidth?: FooterContainerWidth;
  alignment?: FooterAlignment;
}

export interface FooterResponsive {
  desktop: 2 | 3 | 4;
  tablet: 1 | 2 | 3;
  mobile: 1;
}

export interface FooterWorkspaceV1 {
  version: 1;
  layout: FooterLayout;
  gridColumns: 2 | 3 | 4;
  design: FooterDesign;
  columns: FooterColumn[];
  copyright: FooterCopyright;
}

export interface FooterWorkspaceV2 {
  version: 2;
  layout: FooterLayout;
  gridColumns?: 2 | 3 | 4;
  responsive: FooterResponsive;
  design: FooterDesign;
  columns: FooterColumn[];
  copyright: FooterCopyright;
}

export type FooterWorkspace = FooterWorkspaceV2;

export interface ResolvedFooterLink {
  label: string;
  href: string;
  openInNewTab: boolean;
}

export interface ResolvedFooterColumn {
  id: string;
  type: FooterSectionType;
  enabled: boolean;
  title: string;
  links: ResolvedFooterLink[];
  body: string;
  showSocial: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  columnSlot?: 1 | 2 | 3 | 4;
  hiddenOnTablet: boolean;
  hiddenOnMobile: boolean;
  socialSource: FooterSocialSource;
  socialStyle: FooterSocialStyle;
  socialIconSize: FooterSocialSize;
  socialLayout: FooterSocialLayout;
}

export interface ResolvedFooterDesign extends Required<FooterDesign> {}

export interface ResolvedFooter {
  layout: FooterLayout;
  gridColumns: 2 | 3 | 4;
  responsive: FooterResponsive;
  design: ResolvedFooterDesign;
  columns: ResolvedFooterColumn[];
  copyright: Required<FooterCopyright> & { legalLinks: ResolvedFooterLink[] };
}

/** Company contact for footer chrome; address resolved via getLocalizedField. */
export type FooterCompanyInfo = {
  phone: string;
  email: string;
  socialLinks?: Record<string, string> | unknown;
} & Record<string, unknown>;
