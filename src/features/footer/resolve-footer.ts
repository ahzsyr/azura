import type {
  FooterColumn,
  FooterLink,
  FooterWorkspace,
  ResolvedFooter,
  ResolvedFooterColumn,
  ResolvedFooterLink,
} from "./types";

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v.trim() || fb : fb;
}

function resolveLinks(links: FooterLink[] | undefined): ResolvedFooterLink[] {
  return (links ?? [])
    .filter((l) => l.label?.trim() && l.href?.trim())
    .map((l) => ({
      label: l.label.trim(),
      href: l.href.trim(),
      openInNewTab: Boolean(l.openInNewTab),
    }));
}

function resolveColumn(raw: FooterColumn): ResolvedFooterColumn {
  return {
    id: raw.id,
    type: raw.type,
    enabled: raw.enabled !== false,
    title: str(raw.title, ""),
    links: resolveLinks(raw.links),
    body: str(raw.body, ""),
    showSocial: raw.showSocial !== false,
    showEmail: raw.showEmail !== false,
    showPhone: raw.showPhone !== false,
    showAddress: raw.showAddress !== false,
  };
}

export function resolveFooter(workspace: FooterWorkspace): ResolvedFooter {
  const design = workspace.design ?? {};
  return {
    layout: workspace.layout === "centered" ? "centered" : "grid",
    gridColumns: workspace.gridColumns === 2 || workspace.gridColumns === 4 ? workspace.gridColumns : 3,
    design: {
      linkStyle: design.linkStyle ?? "muted",
      headingStyle: design.headingStyle ?? "uppercase",
      columnGap: design.columnGap ?? "normal",
      borderStyle: design.borderStyle ?? "subtle",
    },
    columns: workspace.columns.map(resolveColumn).filter((c) => c.enabled),
    copyright: {
      showBar: workspace.copyright?.showBar !== false,
      rightsText: str(workspace.copyright?.rightsText, "All rights reserved."),
      suffix: str(workspace.copyright?.suffix, ""),
      legalLinks: resolveLinks(workspace.copyright?.legalLinks),
    },
  };
}
