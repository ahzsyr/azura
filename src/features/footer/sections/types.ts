import type { ComponentType } from "react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import type { HeaderWorkspace } from "@/features/navigation/types";
import type { WorkspaceTranslationBundle } from "@/features/translation/workspace-translation.service";
import type { SiteBrandConfig } from "@/types/site-identity";
import type {
  FooterColumn,
  FooterCompanyInfo,
  FooterWorkspace,
  ResolvedFooter,
  ResolvedFooterColumn,
} from "../types";

export const FOOTER_SECTION_TYPES = [
  "brand",
  "menu",
  "contact",
  "social",
  "text",
  "legal",
  "newsletter",
  "payments",
  "trust",
  "opening_hours",
  "apps",
  "logos",
  "partners",
  "rich_text",
  "custom_html",
] as const;

export type FooterSectionType = (typeof FOOTER_SECTION_TYPES)[number];

export type FooterSectionFields = {
  heading?: true;
  body?: true;
  links?: true;
  menuSource?: true;
  visibility?: true;
  companyData?: true;
};

export type FooterSectionMetadata = {
  type: FooterSectionType;
  version: 1;
  label: string;
  description: string;
  icon: string;
  fields: FooterSectionFields;
};

export type SectionResolveContext = {
  column: FooterColumn;
  workspace: FooterWorkspace;
  locale: string;
  brand: SiteBrandConfig;
  company: FooterCompanyInfo | null;
  headerWorkspace: HeaderWorkspace | null;
  catalog: HeaderBuilderCatalog | null;
  translations: WorkspaceTranslationBundle | null;
};

export type FooterRenderContext = {
  locale: string;
  brandName: string;
  tagline: string;
  company?: FooterCompanyInfo | null;
  address?: string;
  social: Record<string, string>;
  resolved: ResolvedFooter;
  headingClass: string;
  linkClass: string;
  compact?: boolean;
};

export type SectionRenderProps = {
  column: ResolvedFooterColumn;
  ctx: FooterRenderContext;
};

export type SectionEditorProps = {
  column: FooterColumn;
  onUpdate: (patch: Partial<FooterColumn>) => void;
};

export type FooterSectionServerPlugin = FooterSectionMetadata & {
  createDefault: (partial?: Partial<FooterColumn>) => FooterColumn;
  validate: (column: FooterColumn) => string | null;
  resolve: (ctx: SectionResolveContext) => ResolvedFooterColumn;
};

export type FooterSectionPlugin = FooterSectionServerPlugin & {
  Editor?: ComponentType<SectionEditorProps>;
  Renderer: ComponentType<SectionRenderProps>;
};
