import type { FooterColumn, FooterLink, ResolvedFooterColumn, ResolvedFooterLink } from "../types";

export function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v.trim() || fb : fb;
}

export function resolveLinks(links: FooterLink[] | undefined): ResolvedFooterLink[] {
  return (links ?? [])
    .filter((l) => l.label?.trim() && l.href?.trim())
    .map((l) => ({
      label: l.label.trim(),
      href: l.href.trim(),
      openInNewTab: Boolean(l.openInNewTab),
    }));
}

export function newSectionId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function baseResolvedColumn(
  raw: FooterColumn,
  overrides?: Partial<ResolvedFooterColumn>,
): ResolvedFooterColumn {
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
    columnSlot: raw.columnSlot,
    hiddenOnTablet: raw.hiddenOnTablet === true,
    hiddenOnMobile: raw.hiddenOnMobile === true,
    socialSource: raw.socialSource ?? "company",
    socialStyle: raw.socialStyle ?? "icons",
    socialIconSize: raw.socialIconSize ?? "md",
    socialLayout: raw.socialLayout ?? "horizontal",
    ...overrides,
  };
}
