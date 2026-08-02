export type CollectionRuleField =
  | "category"
  | "categories"
  | "tags"
  | "brand"
  | "title"
  | "badge"
  | "status"
  | "stock";

export type CollectionRuleOperator = "equals" | "contains" | "starts_with" | "not_equals";

export type CollectionRule = {
  field: CollectionRuleField;
  operator: CollectionRuleOperator;
  value: string;
};

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
  conditions: CollectionRuleSet;
  cardTemplate?: CollectionCardTemplate;
  sortBy?: CollectionSortBy;
  visible?: boolean;
  showInNav?: boolean;
  featured?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

