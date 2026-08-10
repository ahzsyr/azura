import type { RuleGroup } from "@/features/categories/matching/types";

/** @deprecated Prefer Matching Rules RuleLeaf / PRODUCT_RULE_FIELDS */
export type CollectionRuleField =
  | "category"
  | "categories"
  | "tags"
  | "brand"
  | "title"
  | "badge"
  | "status"
  | "stock";

/** @deprecated Prefer MatchingRuleOperator */
export type CollectionRuleOperator = "equals" | "contains" | "starts_with" | "not_equals";

/** @deprecated Prefer RuleLeaf — kept for flat import/generators that still emit { rules[] } */
export type CollectionRule = {
  field: CollectionRuleField;
  operator: CollectionRuleOperator;
  value: string;
};

/** @deprecated Prefer RuleGroup — flat shape upgraded via upgradeLegacyRuleSet */
export type CollectionRuleSet = {
  match: "any" | "all";
  rules: CollectionRule[];
};

export type CollectionSeo = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterCard?: string;
  canonicalPath?: string;
};

export type CollectionCardTemplate = "default" | "featured" | "compact";

export type CollectionSortBy = "price-asc" | "price-desc" | "name-asc" | "name-desc" | "newest";

export type CollectionMembershipMode = "MANUAL" | "RULES" | "HYBRID";

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge?: string;
  coverImage?: string;
  iconImage?: string;
  parentSlug?: string;
  seo?: CollectionSeo;
  /** Canonical Matching Rules root group (legacy flat { rules[] } upgraded on read). */
  conditions: RuleGroup;
  /**
   * Membership strategy mirrored to Category.membershipMode on dual-write.
   * When omitted, dual-write derives MANUAL from empty conditions, else HYBRID.
   */
  membershipMode?: CollectionMembershipMode;
  cardTemplate?: CollectionCardTemplate;
  sortBy?: CollectionSortBy;
  visible?: boolean;
  showInNav?: boolean;
  featured?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};
