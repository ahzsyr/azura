import type {
  Product,
  ProductDetailedSection,
  ProductModel3dObject,
  ProductSectionMedia,
  ProductSectionVideo,
} from "@/features/products/types";
import { normalizeProductModel3dObject } from "./product-detailed-description";
import { rowsForGroup } from "./product-spec-rows";

export type UniFiTabKind = "overview" | "technical" | "installation" | "in_the_box" | "generic";

export type UniFiTabDef = {
  /** Kebab id for hash / DOM (`in-the-box`). */
  id: string;
  /** Canonical snake key (`in_the_box`). */
  key: string;
  label: string;
  kind: UniFiTabKind;
};

const TAB_ALIASES: Record<string, string> = {
  overview: "overview",
  technical: "technical",
  specs: "technical",
  specifications: "technical",
  installation: "installation",
  install: "installation",
  in_the_box: "in_the_box",
  "in-the-box": "in_the_box",
  inbox: "in_the_box",
  "3d": "3d",
};

const KNOWN_TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  technical: "Technical",
  installation: "Installation Tutorial",
  in_the_box: "In The Box",
};

const GALLERY_ONLY_TABS = new Set(["3d"]);

export function canonicalizeUniFiTabKey(tab: string | undefined): string | null {
  if (!tab?.trim()) return null;
  const folded = tab.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return TAB_ALIASES[folded] ?? TAB_ALIASES[tab.trim().toLowerCase()] ?? folded;
}

export function uniFiTabDomId(key: string): string {
  return key.replace(/_/g, "-");
}

export function uniFiTabKind(key: string): UniFiTabKind {
  if (key === "overview" || key === "technical" || key === "installation" || key === "in_the_box") {
    return key;
  }
  return "generic";
}

/** @deprecated Use canonicalizeUniFiTabKey */
export function normalizeUniFiSectionTab(tab: string | undefined): string | null {
  return canonicalizeUniFiTabKey(tab);
}

export function sectionsForTab(product: Product, tab: string): ProductDetailedSection[] {
  const key = canonicalizeUniFiTabKey(tab);
  if (!key) return [];
  const matched = (product.detailed_description ?? []).filter(
    (section) => canonicalizeUniFiTabKey(section.tab) === key,
  );
  if (matched.length > 0) return matched;
  if (key === "overview" && !hasNamedContentTabs(product)) {
    return (product.detailed_description ?? []).filter(
      (section) => !section.tab && Boolean(section.heading || section.text),
    );
  }
  return [];
}

export function sectionMedia(sections: ProductDetailedSection[]): ProductSectionMedia[] {
  return sections.flatMap((section) => section.media ?? []).filter((item) => Boolean(item.url?.trim()));
}

export function sectionVideos(sections: ProductDetailedSection[]): ProductSectionVideo[] {
  return sections.flatMap((section) => section.videos ?? []).filter((item) => Boolean(item.url?.trim()));
}

export function sectionHasContent(section: ProductDetailedSection): boolean {
  return (
    Boolean(section.text?.trim()) ||
    (section.media?.length ?? 0) > 0 ||
    (section.videos?.length ?? 0) > 0 ||
    (section.features?.length ?? 0) > 0
  );
}

export function resolveModel3d(product: Product): ProductModel3dObject | null {
  const fromMedia = normalizeProductModel3dObject(product.media?.["3d_model"]);
  if (fromMedia?.enabled !== false && (fromMedia?.url || fromMedia?.variants?.length)) return fromMedia;

  for (const section of sectionsForTab(product, "3d")) {
    const fromSection = normalizeProductModel3dObject(section.model_3d);
    if (fromSection?.enabled !== false && (fromSection?.url || fromSection?.variants?.length)) {
      return fromSection;
    }
  }

  const file = product.media?.files?.find((entry) => {
    const row = entry as { type?: string; url?: string };
    return row.type === "3d_model" && Boolean(row.url?.trim());
  }) as { url?: string } | undefined;
  if (file?.url?.trim()) return { enabled: true, url: file.url.trim() };

  return fromMedia ?? null;
}

export function hasNamedContentTabs(product: Product): boolean {
  return (product.detailed_description ?? []).some((section) => {
    const key = canonicalizeUniFiTabKey(section.tab);
    return Boolean(key) && !GALLERY_ONLY_TABS.has(key!);
  });
}

export function hasOverviewContent(product: Product): boolean {
  return sectionsForTab(product, "overview").some(sectionHasContent);
}

export function hasTechnicalContent(product: Product): boolean {
  return (product.specifications ?? []).some((group) => rowsForGroup(group).length > 0);
}

export function hasInstallationContent(product: Product): boolean {
  const sections = sectionsForTab(product, "installation");
  return sections.some(sectionHasContent) || sectionVideos(sections).length > 0;
}

export function hasInTheBoxContent(product: Product): boolean {
  return sectionMedia(sectionsForTab(product, "in_the_box")).length > 0;
}

export function hasTabContent(product: Product, tab: string): boolean {
  const key = canonicalizeUniFiTabKey(tab) ?? tab;
  switch (uniFiTabKind(key)) {
    case "overview":
      return hasOverviewContent(product);
    case "technical":
      return hasTechnicalContent(product) || sectionsForTab(product, key).some(sectionHasContent);
    case "installation":
      return hasInstallationContent(product);
    case "in_the_box":
      return hasInTheBoxContent(product);
    default:
      if (key === "3d") return Boolean(resolveModel3d(product)?.url);
      return sectionsForTab(product, key).some(sectionHasContent);
  }
}

function humanizeTabKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function labelForUniFiTab(product: Product, key: string): string {
  const sections = sectionsForTab(product, key);
  const explicit = sections.find((section) => section.tab_label?.trim())?.tab_label?.trim();
  if (explicit) return explicit;

  const known = KNOWN_TAB_LABELS[key];
  const human = known ?? humanizeTabKey(key);
  const headings = [
    ...new Set(sections.map((section) => section.heading?.trim()).filter((heading): heading is string => Boolean(heading))),
  ];
  const foldedHuman = human.toLowerCase();
  const exact = headings.find((heading) => heading.toLowerCase() === foldedHuman || heading.toLowerCase() === key.replace(/_/g, " "));
  if (exact) return exact;
  if (headings.length === 1) return headings[0]!;
  return human;
}

function orderedTabKeys(product: Product): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const section of product.detailed_description ?? []) {
    const key = canonicalizeUniFiTabKey(section.tab);
    if (!key || GALLERY_ONLY_TABS.has(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  if (!seen.has("technical") && hasTechnicalContent(product)) {
    keys.push("technical");
  }
  if (keys.length === 0 && hasOverviewContent(product)) {
    keys.push("overview");
  }
  return keys;
}

export function listUniFiTabCandidates(product: Product): UniFiTabDef[] {
  return orderedTabKeys(product)
    .filter((key) => hasTabContent(product, key))
    .map((key) => ({
      id: uniFiTabDomId(key),
      key,
      label: labelForUniFiTab(product, key),
      kind: uniFiTabKind(key),
    }));
}
