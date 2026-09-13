import type { SiteBrandConfig } from "@/types/site-identity";
import { parseBrandConfig } from "@/features/theme/theme-config";
import type { FooterCompanyInfo, FooterWorkspace, ResolvedFooter } from "./types";
import type { SectionResolveContext } from "./sections/types";
import { getServerPlugin } from "./sections/registry.server";
import { resolveLinks, str } from "./sections/shared";

export type ResolveFooterOptions = {
  locale?: string;
  brand?: SiteBrandConfig;
  company?: FooterCompanyInfo | null;
  headerWorkspace?: SectionResolveContext["headerWorkspace"];
  catalog?: SectionResolveContext["catalog"];
  translations?: SectionResolveContext["translations"];
};

const EMPTY_BRAND: SiteBrandConfig = parseBrandConfig({});

export function resolveFooter(
  workspace: FooterWorkspace,
  options: ResolveFooterOptions = {},
): ResolvedFooter {
  const design = workspace.design ?? {};
  const responsive = workspace.responsive ?? {
    desktop: workspace.gridColumns === 2 || workspace.gridColumns === 4 ? workspace.gridColumns : 3,
    tablet: 2,
    mobile: 1 as const,
  };

  const baseCtx: Omit<SectionResolveContext, "column"> = {
    workspace,
    locale: options.locale ?? "en",
    brand: options.brand ?? EMPTY_BRAND,
    company: options.company ?? null,
    headerWorkspace: options.headerWorkspace ?? null,
    catalog: options.catalog ?? null,
    translations: options.translations ?? null,
  };

  const columns = workspace.columns
    .map((column) => {
      const plugin = getServerPlugin(column.type);
      if (!plugin) return null;
      return plugin.resolve({ ...baseCtx, column });
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.enabled);

  return {
    layout: workspace.layout === "centered" ? "centered" : "grid",
    gridColumns: responsive.desktop,
    responsive,
    design: {
      linkStyle: design.linkStyle ?? "muted",
      headingStyle: design.headingStyle ?? "uppercase",
      columnGap: design.columnGap ?? "normal",
      borderStyle: design.borderStyle ?? "subtle",
      background: design.background ?? "inherit",
      textTone: design.textTone ?? "light",
      padding: design.padding ?? "medium",
      divider: design.divider ?? "top",
      containerWidth: design.containerWidth ?? "default",
      alignment: design.alignment ?? "start",
    },
    columns,
    copyright: {
      showBar: workspace.copyright?.showBar !== false,
      rightsText: str(workspace.copyright?.rightsText, "All rights reserved."),
      suffix: str(workspace.copyright?.suffix, ""),
      legalLinks: resolveLinks(workspace.copyright?.legalLinks),
    },
  };
}
