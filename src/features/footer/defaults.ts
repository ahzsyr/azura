import type { FooterResponsive, FooterWorkspace, FooterWorkspaceV1, FooterWorkspaceV2 } from "./types";

export function defaultResponsive(desktop: 2 | 3 | 4 = 3): FooterResponsive {
  return {
    desktop,
    tablet: desktop >= 3 ? 2 : 1,
    mobile: 1,
  };
}

export function migrateFooterWorkspace(raw: unknown): FooterWorkspaceV2 {
  if (!raw || typeof raw !== "object") {
    return createDefaultFooterWorkspace();
  }

  const o = raw as Partial<FooterWorkspaceV1> & Partial<FooterWorkspaceV2> & { version?: number };

  if (o.version === 2 && o.responsive) {
    return normalizeV2(o as FooterWorkspaceV2);
  }

  const gridColumns =
    o.gridColumns === 2 || o.gridColumns === 4 ? o.gridColumns : 3;

  return normalizeV2({
    version: 2,
    layout: o.layout === "centered" ? "centered" : "grid",
    gridColumns,
    responsive: o.responsive ?? defaultResponsive(gridColumns),
    design: o.design ?? {},
    columns: Array.isArray(o.columns) ? o.columns : [],
    copyright: o.copyright ?? {},
  });
}

function normalizeV2(ws: Partial<FooterWorkspaceV2>): FooterWorkspaceV2 {
  const desktop =
    ws.responsive?.desktop === 2 || ws.responsive?.desktop === 4
      ? ws.responsive.desktop
      : ws.gridColumns === 2 || ws.gridColumns === 4
        ? ws.gridColumns
        : 3;

  const responsive: FooterResponsive = {
    desktop,
    tablet:
      ws.responsive?.tablet === 1 || ws.responsive?.tablet === 3
        ? ws.responsive.tablet
        : 2,
    mobile: 1,
  };

  const base = createDefaultFooterWorkspace();
  const design = { ...base.design, ...(ws.design ?? {}) };

  return {
    version: 2,
    layout: ws.layout === "centered" ? "centered" : "grid",
    gridColumns: desktop,
    responsive,
    design,
    columns:
      Array.isArray(ws.columns) && ws.columns.length > 0 ? ws.columns : base.columns,
    copyright: { ...base.copyright, ...(ws.copyright ?? {}) },
  };
}

export function createDefaultFooterWorkspace(): FooterWorkspace {
  const responsive = defaultResponsive(3);
  return {
    version: 2,
    layout: "grid",
    gridColumns: 3,
    responsive,
    design: {
      linkStyle: "muted",
      headingStyle: "uppercase",
      columnGap: "normal",
      borderStyle: "subtle",
      background: "inherit",
      textTone: "light",
      padding: "medium",
      divider: "top",
      containerWidth: "default",
      alignment: "start",
    },
    columns: [
      { id: "brand", type: "brand", enabled: true, title: "" },
      {
        id: "links",
        type: "menu",
        enabled: true,
        title: "Quick links",
        menuSource: "custom",
        links: [
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: "Collections", href: "/collections" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        id: "contact",
        type: "contact",
        enabled: true,
        title: "Contact",
        showEmail: true,
        showPhone: true,
        showAddress: false,
      },
      { id: "social", type: "social", enabled: true, title: "Connect", showSocial: true },
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
  const migrated = migrateFooterWorkspace(raw);
  return migrated;
}
