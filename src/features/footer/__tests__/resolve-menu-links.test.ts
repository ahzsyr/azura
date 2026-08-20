import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FooterColumn } from "@/features/footer/types";
import type { HeaderBuilderCatalog, HeaderWorkspace, MenuItem } from "@/features/navigation/types";
import { resolveMenuSourceLinks } from "@/features/footer/sections/resolve-menu-links";

function linkItem(label: string, url: string, children: MenuItem[] = []): MenuItem {
  return {
    id: label.toLowerCase().replace(/\s+/g, "-"),
    type: "link",
    label,
    placement: "both",
    url,
    children,
  };
}

function makeWorkspace(): HeaderWorkspace {
  return {
    version: 1,
    activeMenuKey: "mainMenu",
    menusDatabase: {
      mainMenu: {
        name: "Main Menu",
        globalApply: "Both",
        items: [
          linkItem("Brands", "/brands"),
          linkItem("Products", "/products"),
          linkItem("Services", "/services", [
            linkItem("Enterprise Indoor Coverage", "/services/indoor-coverage"),
          ]),
          linkItem("Account", "/account"),
          linkItem("About Us", "/about"),
        ],
      },
      menu_service: {
        name: "ServiceMenu",
        globalApply: "none",
        items: [
          linkItem("Enterprise Wireless Networks", "/services/enterprise-wireless"),
          linkItem("Enterprise Indoor Coverage", "/services/indoor-coverage"),
          linkItem("Enterprise Security Solutions", "/services/security-systems"),
          linkItem("IoT & Smart Technology", "/services/iot-solutions"),
          linkItem("IP PBX & Unified Communications", "/services/ip-pbx"),
        ],
      },
    },
    branding: {} as HeaderWorkspace["branding"],
    headerActions: [],
    settings: {} as HeaderWorkspace["settings"],
  };
}

function makeCatalog(): HeaderBuilderCatalog {
  return {
    pages: [],
    collections: [
      { slug: "root-a", name: "Root A" },
      { slug: "root-b", name: "Root B" },
      { slug: "child-a", name: "Child A", parentSlug: "root-a" },
    ],
    brands: [],
    tags: [],
    products: [],
    posts: [],
    contentByType: {},
    contentTypes: [],
    sourceFamilies: [],
  };
}

function menuColumn(overrides: Partial<FooterColumn> = {}): FooterColumn {
  return {
    id: "services",
    type: "menu",
    ...overrides,
  };
}

describe("resolveMenuSourceLinks", () => {
  it("uses the selected menu key for header source instead of live desktop menu", () => {
    const workspace = makeWorkspace();
    const links = resolveMenuSourceLinks(
      menuColumn({ menuSource: "header", headerMenuKey: "menu_service" }),
      workspace,
      null,
    );

    assert.equal(links.length, 5);
    assert.deepEqual(
      links.map((l) => l.label),
      [
        "Enterprise Wireless Networks",
        "Enterprise Indoor Coverage",
        "Enterprise Security Solutions",
        "IoT & Smart Technology",
        "IP PBX & Unified Communications",
      ],
    );
    assert.ok(!links.some((l) => l.label === "Brands"));
    assert.ok(!links.some((l) => l.label === "Account"));
  });

  it("falls back to live desktop menu for header source without an explicit key", () => {
    const workspace = makeWorkspace();
    const links = resolveMenuSourceLinks(menuColumn({ menuSource: "header" }), workspace, null);

    const labels = links.map((l) => l.label);
    assert.ok(labels.includes("Brands"));
    assert.ok(labels.includes("Products"));
    assert.ok(labels.includes("Enterprise Indoor Coverage"));
    assert.equal(links.length, 6);
  });

  it("uses the selected menu key for footer source", () => {
    const workspace = makeWorkspace();
    const links = resolveMenuSourceLinks(
      menuColumn({ menuSource: "footer", headerMenuKey: "menu_service" }),
      workspace,
      null,
    );

    assert.equal(links.length, 5);
    assert.equal(links[0]?.label, "Enterprise Wireless Networks");
  });

  it("falls back to activeMenuKey for footer source without an explicit key", () => {
    const workspace = makeWorkspace();
    const links = resolveMenuSourceLinks(menuColumn({ menuSource: "footer" }), workspace, null);

    const labels = links.map((l) => l.label);
    assert.ok(labels.includes("Brands"));
    assert.ok(labels.includes("Products"));
  });

  it("returns custom links unchanged", () => {
    const customLinks = [
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
    ];
    const links = resolveMenuSourceLinks(
      menuColumn({ menuSource: "custom", links: customLinks }),
      makeWorkspace(),
      null,
    );

    assert.deepEqual(links, customLinks);
  });

  it("returns root collections only for category source", () => {
    const links = resolveMenuSourceLinks(
      menuColumn({ menuSource: "category" }),
      null,
      makeCatalog(),
    );

    assert.equal(links.length, 2);
    assert.deepEqual(
      links.map((l) => l.label),
      ["Root A", "Root B"],
    );
  });

  it("returns all collections for collection source", () => {
    const links = resolveMenuSourceLinks(
      menuColumn({ menuSource: "collection" }),
      null,
      makeCatalog(),
    );

    assert.equal(links.length, 3);
    assert.deepEqual(
      links.map((l) => l.label),
      ["Root A", "Root B", "Child A"],
    );
  });

  it("omits hidden header items from footer navigation links", () => {
    const workspace = makeWorkspace();
    workspace.menusDatabase.mainMenu.items = [
      linkItem("Brands", "/brands"),
      { ...linkItem("Hidden page", "/secret"), visibility: "hidden" },
      linkItem("Services", "/services", [
        linkItem("WiFi", "/services/wifi"),
        { ...linkItem("Internal", "/services/internal"), visibility: "hidden" },
      ]),
    ];

    const links = resolveMenuSourceLinks(menuColumn({ menuSource: "header" }), workspace, null);
    const labels = links.map((l) => l.label);
    assert.deepEqual(labels, ["Brands", "Services", "WiFi"]);
    assert.ok(!labels.includes("Hidden page"));
    assert.ok(!labels.includes("Internal"));
  });
});
