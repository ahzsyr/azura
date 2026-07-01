import type { FooterColumn, FooterWorkspace } from "./types";

function col(partial: Partial<FooterColumn> & Pick<FooterColumn, "id" | "type">): FooterColumn {
  return {
    enabled: true,
    title: "",
    menuSource: "custom",
    links: [],
    showSocial: true,
    showEmail: true,
    showPhone: true,
    showAddress: true,
    ...partial,
  };
}

export function createDefaultFooterWorkspace(): FooterWorkspace {
  return {
    version: 1,
    layout: "grid",
    gridColumns: 3,
    design: {
      linkStyle: "muted",
      headingStyle: "uppercase",
      columnGap: "normal",
      borderStyle: "subtle",
    },
    columns: [
      col({ id: "brand", type: "brand", title: "" }),
      col({
        id: "links",
        type: "menu",
        title: "Quick links",
        links: [
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: "Collections", href: "/collections" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      }),
      col({
        id: "contact",
        type: "contact",
        title: "Contact",
        showEmail: true,
        showPhone: true,
        showAddress: false,
      }),
      col({ id: "social", type: "social", title: "Connect", showSocial: true }),
    ],
    copyright: {
      showBar: true,
      rightsText: "All rights reserved.",
      suffix: "",
      legalLinks: [],
    },
  };
}

export function mergeFooterWorkspaceImport(raw: unknown): FooterWorkspace {
  const base = createDefaultFooterWorkspace();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<FooterWorkspace>;
  return {
    ...base,
    ...o,
    version: 1,
    design: { ...base.design, ...(o.design ?? {}) },
    columns: Array.isArray(o.columns) && o.columns.length ? o.columns : base.columns,
    copyright: { ...base.copyright, ...(o.copyright ?? {}) },
  };
}
