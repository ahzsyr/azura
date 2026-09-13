import { generateId } from "./menu-engine";
import type { MegaMenuContentConfig, MegaMenuPanelConfig, MenuItem } from "./types";

export type MegaMenuPresetId = "unifi-start-here" | "unifi-switching" | "featured-plus-cards";

export type MegaMenuPreset = {
  id: MegaMenuPresetId;
  label: string;
  description: string;
  /** Generates ordinary v2 config — no runtime coupling to preset id. */
  build: (parentLabel?: string) => {
    megaMenuType: "sidebar" | "panel";
    megaMenu: MegaMenuContentConfig;
    children: MenuItem[];
  };
};

function child(label: string, url: string, extras?: Partial<MenuItem>): MenuItem {
  return {
    id: generateId(),
    type: "link",
    label,
    placement: "both",
    children: [],
    url,
    visibility: "visible",
    audience: "all",
    ...extras,
  };
}

function panel(
  id: string,
  label: string,
  layout: MegaMenuPanelConfig["layout"],
  childIds: string[],
  extra?: Partial<MegaMenuPanelConfig>,
): MegaMenuPanelConfig {
  return {
    id,
    label,
    layout,
    childIds,
    columns: extra?.columns ?? 4,
    gap: extra?.gap ?? "md",
    ...extra,
  };
}

const presets: MegaMenuPreset[] = [
  {
    id: "unifi-start-here",
    label: "UniFi Start Here",
    description: "Sidebar with 4 sections: How It Works, Resources, Case Studies, Site Map.",
    build: () => {
      const howIds = {
        simple: child("Simple", "/start/simple", { icon: "sparkles" }),
        large: child("Large", "/start/large", { icon: "layers" }),
        massive: child("Massive-Scale", "/start/massive-scale", { icon: "building-2" }),
        multiSite: child("Multi-Site", "/start/multi-site", { icon: "globe" }),
      };
      const howChildren = Object.values(howIds);

      const resourceItems = [
        child("Academy", "/resources/academy"),
        child("Design Center", "/resources/design-center"),
        child("Downloads", "/resources/downloads"),
        child("Community", "/resources/community"),
        child("Training", "/resources/training"),
        child("Blog", "/resources/blog"),
        child("What's New", "/resources/whats-new"),
        child("Case Studies", "/resources/case-studies"),
        child("Support", "/resources/support"),
        child("Store", "/resources/store"),
        child("Partner with UniFi", "/resources/partner"),
      ];

      const caseStudyItems = [
        child("Retail Chain", "/case-studies/retail", { imageUrl: "/images/case-retail.jpg" }),
        child("Campus Network", "/case-studies/campus", { imageUrl: "/images/case-campus.jpg" }),
        child("Healthcare", "/case-studies/healthcare", { imageUrl: "/images/case-healthcare.jpg" }),
        child("Hospitality", "/case-studies/hospitality", { imageUrl: "/images/case-hospitality.jpg" }),
        child("Enterprise HQ", "/case-studies/enterprise", { imageUrl: "/images/case-enterprise.jpg" }),
      ];

      const siteMapFeatured = child("Site Map & Topology", "/sitemap", {
        imageUrl: "/images/sitemap-featured.jpg",
      });
      const cloudGateways = [
        child("Enterprise", "/cloud-gateways/enterprise"),
        child("Large Scale", "/cloud-gateways/large-scale"),
        child("Compact", "/cloud-gateways/compact"),
      ];
      const switching = [
        child("Overview", "/switching"),
        child("Professional", "/switching/professional"),
        child("Value", "/switching/value"),
      ];
      const wifi = [
        child("WiFi 7", "/wifi/wifi-7"),
        child("Enterprise APs", "/wifi/enterprise"),
        child("In-Wall", "/wifi/in-wall"),
      ];
      const physicalSecurity = [
        child("Cameras", "/security/cameras"),
        child("NVR", "/security/nvr"),
        child("Protect", "/security/protect"),
      ];
      const doorAccess = [
        child("Readers", "/access/readers"),
        child("Hubs", "/access/hubs"),
        child("Access Control", "/access/control"),
      ];
      const integrations = [
        child("API", "/integrations/api"),
        child("Webhooks", "/integrations/webhooks"),
        child("Third Party", "/integrations/third-party"),
      ];
      const siteMapChildren = [
        siteMapFeatured,
        ...cloudGateways,
        ...switching,
        ...wifi,
        ...physicalSecurity,
        ...doorAccess,
        ...integrations,
      ];

      const howPanelId = generateId();
      const resourcesPanelId = generateId();
      const caseStudiesPanelId = generateId();
      const siteMapPanelId = generateId();

      const howPanel = panel(howPanelId, "How It Works?", "iconGrid", howChildren.map((c) => c.id), {
        columns: 4,
      });
      const resourcesPanel = panel(
        resourcesPanelId,
        "Resources",
        "featured",
        resourceItems.map((c) => c.id),
        { columns: 5, carousel: { enabled: true, arrows: true } },
      );
      const caseStudiesPanel = panel(
        caseStudiesPanelId,
        "Case Studies",
        "featured",
        caseStudyItems.map((c) => c.id),
        { columns: 5 },
      );
      const siteMapPanel = panel(
        siteMapPanelId,
        "Site Map",
        "mixed",
        siteMapChildren.map((c) => c.id),
        {
          featured: { childId: siteMapFeatured.id, ctaLabel: "Expand" },
          columnGroups: [
            { id: generateId(), heading: "Cloud Gateways", childIds: cloudGateways.map((c) => c.id) },
            { id: generateId(), heading: "Switching", childIds: switching.map((c) => c.id) },
            { id: generateId(), heading: "WiFi", childIds: wifi.map((c) => c.id) },
            { id: generateId(), heading: "Physical Security", childIds: physicalSecurity.map((c) => c.id) },
            { id: generateId(), heading: "Door Access", childIds: doorAccess.map((c) => c.id) },
            { id: generateId(), heading: "Integrations", childIds: integrations.map((c) => c.id) },
          ],
        },
      );

      const blogId = resourceItems[5].id;
      const firstCaseId = caseStudyItems[0].id;

      return {
        megaMenuType: "sidebar",
        megaMenu: {
          version: 2,
          surfaceWidth: "container",
          alignment: "center",
          childCtaLabels: {
            [blogId]: "View All",
            [firstCaseId]: "View All",
          },
          navigation: {
            enabled: true,
            width: 220,
            items: [
              { id: generateId(), label: "How It Works?", panelId: howPanelId },
              { id: generateId(), label: "Resources", panelId: resourcesPanelId },
              { id: generateId(), label: "Case Studies", panelId: caseStudiesPanelId },
              { id: generateId(), label: "Site Map", panelId: siteMapPanelId },
            ],
          },
          panels: [howPanel, resourcesPanel, caseStudiesPanel, siteMapPanel],
        },
        children: [...howChildren, ...resourceItems, ...caseStudyItems, ...siteMapChildren],
      };
    },
  },
  {
    id: "unifi-switching",
    label: "UniFi Switching",
    description: "Panel-only product grid with subtitles, badges, and Compare All CTA.",
    build: () => {
      const items = [
        child("Overview", "/switching", {
          megaMenuChildDisplayType: "product",
          imageUrl: "/images/switching/overview.jpg",
        }),
        child("Enterprise", "/switching/enterprise", {
          megaMenuChildDisplayType: "product",
          imageUrl: "/images/switching/enterprise.jpg",
        }),
        child("Professional", "/switching/professional", {
          megaMenuChildDisplayType: "product",
          badgeText: "NEW",
          imageUrl: "/images/switching/professional.jpg",
        }),
        child("Value", "/switching/value", {
          megaMenuChildDisplayType: "product",
          imageUrl: "/images/switching/value.jpg",
        }),
        child("Compact", "/switching/compact", {
          megaMenuChildDisplayType: "product",
          imageUrl: "/images/switching/compact.jpg",
        }),
        child("EAV", "/switching/eav", {
          megaMenuChildDisplayType: "product",
          imageUrl: "/images/switching/eav.jpg",
        }),
      ];

      const panelId = generateId();
      const p = panel(panelId, "Switching", "productGrid", items.map((i) => i.id), { columns: 6 });

      return {
        megaMenuType: "panel",
        megaMenu: {
          version: 2,
          surfaceWidth: "container",
          childDescriptions: {
            [items[0].id]: "Scale-ready with full-feature switching.",
            [items[1].id]: "10 GbE & Beyond",
            [items[2].id]: "Layer 3 switching for pros",
            [items[3].id]: "Affordable performance",
            [items[4].id]: "Space-saving form factor",
            [items[5].id]: "Enhanced audio/video",
          },
          childCtaLabels: {
            [items[0].id]: "Compare All",
          },
          panels: [p],
        },
        children: items,
      };
    },
  },
  {
    id: "featured-plus-cards",
    label: "Featured + Cards",
    description: "Large featured card beside smaller cards.",
    build: () => {
      const featured = child("Featured Solution", "/featured");
      const cards = [
        child("Card A", "/a"),
        child("Card B", "/b"),
        child("Card C", "/c"),
        child("Card D", "/d"),
      ];
      const all = [featured, ...cards];
      const panelId = generateId();
      const p = panel(panelId, "Featured", "mixed", all.map((i) => i.id), {
        featured: { childId: featured.id, ctaLabel: "Learn More" },
      });
      return {
        megaMenuType: "panel",
        megaMenu: { version: 2, surfaceWidth: "container", panels: [p] },
        children: all,
      };
    },
  },
];

export const megaMenuPresetService = {
  list(): MegaMenuPreset[] {
    return presets;
  },
  build(id: MegaMenuPresetId) {
    return presets.find((p) => p.id === id)?.build();
  },
};

/** Apply a preset onto a parent menu item (replaces children + mega config). */
export function applyMegaMenuPreset(parent: MenuItem, presetId: MegaMenuPresetId): MenuItem {
  const built = megaMenuPresetService.build(presetId);
  if (!built) return parent;
  return {
    ...parent,
    megaMenuType: built.megaMenuType,
    megaMenu: built.megaMenu,
    children: built.children,
  };
}
