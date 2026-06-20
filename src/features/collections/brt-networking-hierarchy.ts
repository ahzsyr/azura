import type { Collection, CollectionRule } from "./types";
import { normalizeSlug } from "./normalization";
import { buildCollectionExportDocument } from "./collection-export-document";

export type HierarchyNode = {
  name: string;
  children?: HierarchyNode[];
};

/** BRT networking brand/category tree (Alfa, MikroTik, Ubiquiti). */
export const BRT_NETWORKING_HIERARCHY: HierarchyNode[] = [
  {
    name: "Alfa",
    children: [
      {
        name: "Antennas",
        children: [{ name: "Wi-Fi Indoor" }, { name: "Wi-Fi Outdoor" }],
      },
      {
        name: "Ethernet Devices",
        children: [
          { name: "Embedded Routers" },
          { name: "Network Cards" },
          { name: "Switches" },
          { name: "USB adapters" },
        ],
      },
      {
        name: "Wi-Fi Devices",
        children: [
          { name: "Wi-Fi AP & CPE" },
          { name: "Wi-Fi Kits" },
          { name: "Wi-Fi Routers" },
          { name: "Wi-Fi USB Adapters" },
        ],
      },
    ],
  },
  {
    name: "MikroTik",
    children: [
      {
        name: "60GHz Wireless",
        children: [{ name: "60GHz antennas" }, { name: "Wireless Wire" }],
      },
      { name: "Accessories" },
      { name: "Antennas" },
      { name: "Anti-Noise Shields" },
      { name: "Brackets" },
      { name: "Coaxial Cables" },
      { name: "Enclosure" },
      {
        name: "Ethernet Routers",
        children: [
          { name: "Cloud Core Router" },
          { name: "hEX" },
          { name: "PowerBox" },
          { name: "RouterBoards" },
        ],
      },
      {
        name: "Fiber Products",
        children: [{ name: "Converters" }, { name: "SFP Cables" }, { name: "SFP Modules" }],
      },
      {
        name: "IoT Products",
        children: [
          { name: "Antennas" },
          { name: "Gateways" },
          { name: "miniPCI-e" },
          { name: "Tags, Sensors" },
        ],
      },
      { name: "Licenses" },
      {
        name: "Mobile Network Products",
        children: [
          { name: "4G Routers" },
          { name: "5G Routers" },
          { name: "ATL" },
          { name: "LHG" },
          { name: "LtAP" },
          { name: "miniPCI-e" },
          { name: "SXT" },
          { name: "wAP" },
        ],
      },
      { name: "Pigtail" },
      { name: "Power Adapters" },
      { name: "Servers" },
      {
        name: "Switches",
        children: [
          { name: "Cloud Router Switch" },
          { name: "Cloud Router Switch 10G" },
          { name: "Cloud Router Switch PoE" },
          { name: "Cloud Smart Switche" },
        ],
      },
      {
        name: "Wi-Fi for Home & Office",
        children: [
          { name: "Audience" },
          { name: "cAP" },
          { name: "Chatteau" },
          { name: "hAP" },
          { name: "mAP" },
          { name: "RouterBoard" },
          { name: "wAP" },
        ],
      },
      {
        name: "Wireless Systems",
        children: [
          { name: "BaseBox & NetMetal" },
          { name: "Groove & Metal" },
          { name: "LHG antennas" },
          { name: "mANTBox" },
          { name: "OmniTik" },
          { name: "SXT antennas" },
        ],
      },
    ],
  },
  {
    name: "Ubiquiti",
    children: [
      {
        name: "60 GHz Wireless",
        children: [{ name: "airFiber 60 GHz" }, { name: "Wave 60 GHz" }],
      },
      {
        name: "Accessories Tech",
        children: [
          { name: "Anti-Noise Shields" },
          { name: "Cabling" },
          { name: "Mountings" },
          { name: "Patch Cables" },
          { name: "PoE & Power" },
          { name: "Power Solutions" },
          { name: "RF Shielding" },
        ],
      },
      { name: "AmpliFi" },
      {
        name: "Camera Security",
        children: [
          { name: "Accessories" },
          { name: "Bullet" },
          { name: "Compact" },
          { name: "Dome & Turret" },
          { name: "Doorbells" },
          { name: "NVRs & Viewport" },
          { name: "PTZ" },
          { name: "Special Devices" },
          { name: "Surveillance HDD" },
          { name: "Theta" },
        ],
      },
      { name: "Cloud Keys & Gateways" },
      {
        name: "Door Access",
        children: [
          { name: "Accessories" },
          { name: "Hubs" },
          { name: "Intercoms" },
          { name: "Readers" },
          { name: "Starter Kits" },
        ],
      },
      {
        name: "Fiber",
        children: [
          { name: "Cables" },
          { name: "Converters" },
          { name: "CWDM" },
          { name: "GPON" },
          { name: "SFP Modules" },
          { name: "XGS-PON" },
        ],
      },
      { name: "Mobile Network" },
      { name: "New Integrations" },
      {
        name: "Outdoor Wireless",
        children: [
          { name: "airFiber PtP" },
          { name: "airMAX 2.4 GHz" },
          { name: "airMAX 5 GHz" },
          { name: "LTU 5 GHz" },
          { name: "Outdoor Antennas" },
          { name: "WiFi 7 MLO" },
        ],
      },
      { name: "Power Tech" },
      {
        name: "UniFi Access Points",
        children: [
          { name: "Accessories" },
          { name: "Best Offers" },
          { name: "Enterprise" },
          { name: "Flagship" },
          { name: "Flexible & Outdoor" },
          { name: "In-Wall" },
          { name: "Special Devices" },
          { name: "Wireless Bridges" },
        ],
      },
      {
        name: "UniFi Cloud Gateways",
        children: [{ name: "Compact" }, { name: "Large Scale" }, { name: "WiFi Integrated" }],
      },
      {
        name: "UniFi Switching",
        children: [
          { name: "Aggregation" },
          { name: "Enterprise" },
          { name: "Professional" },
          { name: "Professional Max" },
          { name: "Standard" },
          { name: "Utility" },
        ],
      },
      {
        name: "Wired",
        children: [
          { name: "EdgeMAX Routing" },
          { name: "UISP Console" },
          { name: "UISP Power" },
          { name: "UISP Routing" },
          { name: "UISP Switching" },
          { name: "WiFi CPE" },
        ],
      },
    ],
  },
];

function buildSlugSegment(name: string): string {
  return normalizeSlug(name);
}

function buildPathSlug(parentSlug: string | undefined, name: string): string {
  const segment = buildSlugSegment(name);
  return parentSlug ? `${parentSlug}-${segment}` : segment;
}

function buildBreadcrumbPath(names: string[]): string {
  return names.join(" > ");
}

function buildConditions(
  name: string,
  rootBrand: string,
  depth: number,
  breadcrumb: string,
): Collection["conditions"] {
  const rules: CollectionRule[] = [];

  if (depth === 0) {
    rules.push(
      { field: "brand", operator: "contains", value: name },
      { field: "title", operator: "contains", value: name },
    );
  } else {
    rules.push(
      { field: "brand", operator: "contains", value: rootBrand },
      { field: "category", operator: "contains", value: name },
      { field: "categories", operator: "contains", value: name },
      { field: "categories", operator: "contains", value: breadcrumb },
    );
  }

  return { match: "any", rules };
}

function flattenHierarchy(
  nodes: HierarchyNode[],
  parentSlug?: string,
  rootBrand?: string,
  namePath: string[] = [],
  out: Collection[] = [],
): Collection[] {
  const now = new Date().toISOString();

  for (const node of nodes) {
    const slug = buildPathSlug(parentSlug, node.name);
    const depth = namePath.length;
    const brand = rootBrand ?? node.name;
    const breadcrumb = buildBreadcrumbPath([...namePath, node.name]);
    const isRoot = depth === 0;

    out.push({
      id: slug,
      slug,
      name: node.name,
      description: isRoot
        ? `${node.name} networking products`
        : `${node.name} — ${brand}`,
      badge: "",
      coverImage: "",
      parentSlug: parentSlug,
      seo: {
        metaTitle: node.name,
        metaDescription: isRoot
          ? `Browse ${node.name} products`
          : `${node.name} in ${brand}`,
        canonicalPath: `/collections/${slug}`,
      },
      conditions: buildConditions(node.name, brand, depth, breadcrumb),
      cardTemplate: "default",
      sortBy: "name-asc",
      visible: true,
      showInNav: isRoot,
      featured: isRoot,
      tags: isRoot ? ["brand"] : ["category", brand.toLowerCase()],
      createdAt: now,
      updatedAt: now,
    });

    if (node.children?.length) {
      flattenHierarchy(node.children, slug, brand, [...namePath, node.name], out);
    }
  }

  return out;
}

export function buildBrtNetworkingCollections(): Collection[] {
  return flattenHierarchy(BRT_NETWORKING_HIERARCHY);
}

export function buildBrtNetworkingExportDocument() {
  return buildCollectionExportDocument(buildBrtNetworkingCollections());
}
