import type { ProductListingRecord } from "@/features/products/listing/types";
import type {
  ProductCardBadgeRule,
  ProductCardBadgeType,
  ResolvedProductCardDesign,
} from "./product-card-design.types";

export interface ResolvedProductCardBadge {
  type: ProductCardBadgeType;
  label: string;
  priority: number;
}

const BADGE_LABELS: Record<ProductCardBadgeType, string> = {
  sale: "Sale",
  new: "New",
  limited: "Limited",
  exclusive: "Exclusive",
  premium: "Premium",
  trending: "Trending",
  bestseller: "Bestseller",
  featured: "Featured",
  low_stock: "Low stock",
  new_arrival: "New arrival",
  pre_order: "Pre-order",
  coming_soon: "Coming soon",
  staff_pick: "Staff pick",
  custom: "Featured",
};

function matchesTagRule(product: ProductListingRecord, rule: ProductCardBadgeRule): boolean {
  if (!rule.tagPrefix) return false;
  const prefix = rule.tagPrefix.toLowerCase();
  return product.tags.some((t) => t.toLowerCase().startsWith(prefix) || t.toLowerCase() === prefix.replace("badge:", ""));
}

function evaluateBadge(
  product: ProductListingRecord,
  rule: ProductCardBadgeRule,
  discountPercent: number,
): ResolvedProductCardBadge | null {
  if (!rule.enabled) return null;

  switch (rule.type) {
    case "sale":
      if (discountPercent <= 0) return null;
      return {
        type: "sale",
        label: rule.label ?? `-${discountPercent}%`,
        priority: rule.priority ?? 10,
      };
    case "low_stock":
      if (product.in_stock) return null;
      return { type: "low_stock", label: rule.label ?? BADGE_LABELS.low_stock, priority: rule.priority ?? 20 };
    case "custom":
    case "new":
    case "bestseller":
    case "trending":
    case "featured":
    case "limited":
    case "exclusive":
    case "premium":
    case "new_arrival":
    case "pre_order":
    case "coming_soon":
    case "staff_pick":
      if (matchesTagRule(product, rule)) {
        return {
          type: rule.type,
          label: rule.label ?? BADGE_LABELS[rule.type],
          priority: rule.priority ?? 50,
        };
      }
      return null;
    default:
      return null;
  }
}

export function resolveProductCardBadges(
  product: ProductListingRecord,
  design: ResolvedProductCardDesign,
  discountPercent: number,
): ResolvedProductCardBadge[] {
  const badges: ResolvedProductCardBadge[] = [];
  for (const rule of design.badgeRules) {
    const badge = evaluateBadge(product, rule, discountPercent);
    if (badge) badges.push(badge);
  }
  return badges
    .sort((a, b) => a.priority - b.priority)
    .slice(0, design.maxBadges);
}
