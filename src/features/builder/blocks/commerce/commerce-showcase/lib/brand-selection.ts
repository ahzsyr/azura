import { brandNameToSlug } from "@/features/catalog/types/catalog-brand-profile";
import type { BrandOverride, BrandSelection } from "@/features/builder/blocks/commerce/commerce-showcase/schemas/showcase-blocks";
import type { BrandShowcaseNode } from "@/features/builder/blocks/commerce/commerce-showcase/types/brand-showcase-node";

export type BrandSelectionProps = {
  brandSelection?: BrandSelection;
  source?: "catalogProfiles" | "manual";
  selectedBrandSlugs?: string[];
  manualSlugs?: string[];
  manualBrands?: unknown[];
};

export function resolveBrandSelectionFromProps(props: BrandSelectionProps): BrandSelection {
  if (props.brandSelection) return props.brandSelection;
  if (props.source === "manual") return "manual";
  if ((props.manualBrands?.length ?? 0) > 0 && !props.selectedBrandSlugs?.length && !props.manualSlugs?.length) {
    return "manual";
  }
  const picked = props.selectedBrandSlugs?.length
    ? props.selectedBrandSlugs
    : props.manualSlugs ?? [];
  if (picked.length > 0) return "pick";
  return "all";
}

export function orderedBrandSlugsFromProps(props: BrandSelectionProps): string[] {
  if (props.selectedBrandSlugs?.length) return props.selectedBrandSlugs;
  return props.manualSlugs ?? [];
}

export function buildBrandSelectionPatch(
  mode: BrandSelection,
  _currentProps?: BrandSelectionProps,
): Record<string, unknown> {
  switch (mode) {
    case "manual":
      return { brandSelection: "manual", source: "manual", sort: "manual" };
    case "pick":
      return { brandSelection: "pick", source: "catalogProfiles", sort: "manual" };
    default:
      return { brandSelection: "all", source: "catalogProfiles" };
  }
}

export function coerceBrandShowcaseProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const selection = resolveBrandSelectionFromProps(props as BrandSelectionProps);
  const manualSlugs = (props.manualSlugs as string[] | undefined) ?? [];
  const selectedBrandSlugs = (props.selectedBrandSlugs as string[] | undefined) ?? [];
  const migratedSlugs =
    selectedBrandSlugs.length > 0
      ? selectedBrandSlugs
      : manualSlugs.length > 0
        ? manualSlugs
        : [];

  return {
    ...props,
    brandSelection: selection,
    selectedBrandSlugs: migratedSlugs,
    source: selection === "manual" ? "manual" : "catalogProfiles",
  };
}

export function mergeBrandWithOverrides(
  node: BrandShowcaseNode,
  override?: BrandOverride | null,
): BrandShowcaseNode {
  if (!override) return node;
  const name = override.name?.trim() || node.name;
  return {
    ...node,
    name,
    nameEn: name,
    nameAr: node.nameAr,
    logoUrl: override.logoUrl?.trim() || node.logoUrl,
    bannerUrl: override.bannerUrl?.trim() || node.bannerUrl,
    description: override.description?.trim() || node.description,
    descriptionEn: override.description?.trim() || node.descriptionEn,
    descriptionAr: node.descriptionAr,
    href: override.href?.trim() || node.href,
  };
}

export function slugFromBrandName(name: string, _nameAr: string, currentSlug: string): string {
  const trimmed = name.trim();
  if (!trimmed) return currentSlug;
  return brandNameToSlug(trimmed) || currentSlug;
}

export function brandSelectionSummary(props: BrandSelectionProps): string {
  const mode = resolveBrandSelectionFromProps(props);
  if (mode === "all") return "All catalog brands";
  if (mode === "manual") {
    const count = (props.manualBrands as unknown[] | undefined)?.length ?? 0;
    return `Manual brands · ${count} brand${count !== 1 ? "s" : ""}`;
  }
  const count = orderedBrandSlugsFromProps(props).length;
  return `Pick from catalog · ${count} brand${count !== 1 ? "s" : ""}`;
}
