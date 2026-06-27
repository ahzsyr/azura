import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CreditCard,
  FileText,
  Grid3x3,
  Image,
  Layers,
  List,
  MessageSquare,
  Package,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  Zap,
} from "lucide-react";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import type { ProductPageOverflowBlockKey } from "@/features/products/lib/product-page-overflow";

export type BuilderBlockCategory = "core" | "content" | "merchandising" | "advanced";

export type BuilderColumnZone = "structure" | "main" | "side" | "nested";

export type BuilderBlockId = keyof ResolvedProductPageDisplay | "faq" | "customContent";

export interface BuilderBlockDef {
  id: BuilderBlockId;
  label: string;
  description?: string;
  category: BuilderBlockCategory;
  icon: LucideIcon;
  zone: BuilderColumnZone;
  orderable: boolean;
  overflowKey?: ProductPageOverflowBlockKey;
  comingSoon?: boolean;
  parentId?: BuilderBlockId;
}

export const BUILDER_BLOCK_CATEGORIES: Array<{ id: BuilderBlockCategory; label: string }> = [
  { id: "core", label: "Core" },
  { id: "content", label: "Content" },
  { id: "merchandising", label: "Merchandising" },
  { id: "advanced", label: "Advanced" },
];

export const PRODUCT_PAGE_BUILDER_BLOCKS: BuilderBlockDef[] = [
  {
    id: "breadcrumb",
    label: "Breadcrumb",
    category: "core",
    icon: List,
    zone: "structure",
    orderable: false,
  },
  {
    id: "gallery",
    label: "Product Gallery",
    description: "Hero media and thumbnails",
    category: "core",
    icon: Image,
    zone: "structure",
    orderable: false,
  },
  {
    id: "sideBuyBox",
    label: "Product Info",
    description: "Buy box column container",
    category: "core",
    icon: ShoppingBag,
    zone: "structure",
    orderable: false,
  },
  {
    id: "price",
    label: "Price",
    category: "core",
    icon: CreditCard,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "quantity",
    label: "Quantity Selector",
    category: "core",
    icon: Grid3x3,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "variations",
    label: "Variants",
    category: "core",
    icon: Layers,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "addToCart",
    label: "Add To Cart",
    category: "core",
    icon: ShoppingCart,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "buyNow",
    label: "Buy Now Button",
    category: "core",
    icon: Zap,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "delivery",
    label: "Delivery Information",
    category: "core",
    icon: Truck,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "trust",
    label: "Trust Badges",
    category: "core",
    icon: BadgeCheck,
    zone: "main",
    orderable: true,
  },
  {
    id: "keySpecs",
    label: "Features",
    category: "content",
    icon: Star,
    zone: "nested",
    orderable: true,
    parentId: "sideBuyBox",
  },
  {
    id: "tabs",
    label: "Content Tabs",
    category: "content",
    icon: FileText,
    zone: "main",
    orderable: true,
  },
  {
    id: "tabDescription",
    label: "Product Description",
    category: "content",
    icon: FileText,
    zone: "nested",
    orderable: false,
    parentId: "tabs",
  },
  {
    id: "tabSpecs",
    label: "Specifications",
    category: "content",
    icon: List,
    zone: "nested",
    orderable: false,
    parentId: "tabs",
  },
  {
    id: "tabReviews",
    label: "Reviews",
    category: "content",
    icon: MessageSquare,
    zone: "nested",
    orderable: false,
    parentId: "tabs",
  },
  {
    id: "frequentlyBought",
    label: "Related Products",
    category: "merchandising",
    icon: Package,
    zone: "main",
    orderable: true,
  },
  {
    id: "crossLinks",
    label: "Cross Sell Products",
    category: "merchandising",
    icon: ShoppingBag,
    zone: "main",
    orderable: true,
    overflowKey: "crossLinks",
  },
  {
    id: "linkedTags",
    label: "Collection Tags",
    category: "merchandising",
    icon: Tag,
    zone: "side",
    orderable: true,
    overflowKey: "linkedTags",
  },
  {
    id: "promo",
    label: "Promo Banner",
    category: "merchandising",
    icon: Zap,
    zone: "main",
    orderable: true,
  },
  {
    id: "servicesBar",
    label: "Warranty Information",
    category: "merchandising",
    icon: BadgeCheck,
    zone: "main",
    orderable: true,
    overflowKey: "servicesBar",
  },
  {
    id: "faq",
    label: "FAQ",
    category: "advanced",
    icon: MessageSquare,
    zone: "main",
    orderable: false,
    comingSoon: true,
  },
  {
    id: "customContent",
    label: "Custom Content",
    category: "advanced",
    icon: Layers,
    zone: "main",
    orderable: false,
    comingSoon: true,
  },
];

export function getBuilderBlock(id: BuilderBlockId): BuilderBlockDef | undefined {
  return PRODUCT_PAGE_BUILDER_BLOCKS.find((block) => block.id === id);
}

export function blocksForCategory(category: BuilderBlockCategory): BuilderBlockDef[] {
  return PRODUCT_PAGE_BUILDER_BLOCKS.filter((block) => block.category === category);
}

export function isDisplayKey(id: BuilderBlockId): id is keyof ResolvedProductPageDisplay {
  return id !== "faq" && id !== "customContent";
}
