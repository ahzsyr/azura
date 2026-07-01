export type FooterColumnType = "brand" | "menu" | "contact" | "social" | "text" | "legal";

export type FooterMenuSource = "custom" | "header";

export type FooterLayout = "grid" | "centered";

export type FooterLinkStyle = "default" | "muted" | "underline";

export type FooterHeadingStyle = "uppercase" | "normal";

export type FooterColumnGap = "tight" | "normal" | "loose";

export type FooterBorderStyle = "subtle" | "accent" | "none";

export interface FooterLink {
  label: string;
  href: string;
  openInNewTab?: boolean;
}

export interface FooterColumn {
  id: string;
  type: FooterColumnType;
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
}

export interface FooterWorkspace {
  version: 1;
  layout: FooterLayout;
  gridColumns: 2 | 3 | 4;
  design: FooterDesign;
  columns: FooterColumn[];
  copyright: FooterCopyright;
}

export interface ResolvedFooterLink {
  label: string;
  href: string;
  openInNewTab: boolean;
}

export interface ResolvedFooterColumn {
  id: string;
  type: FooterColumnType;
  enabled: boolean;
  title: string;
  links: ResolvedFooterLink[];
  body: string;
  showSocial: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
}

export interface ResolvedFooter {
  layout: FooterLayout;
  gridColumns: 2 | 3 | 4;
  design: Required<FooterDesign>;
  columns: ResolvedFooterColumn[];
  copyright: Required<FooterCopyright> & { legalLinks: ResolvedFooterLink[] };
}

/** Company contact for footer chrome; address resolved via getLocalizedField. */
export type FooterCompanyInfo = {
  phone: string;
  email: string;
  socialLinks?: Record<string, string> | unknown;
} & Record<string, unknown>;
