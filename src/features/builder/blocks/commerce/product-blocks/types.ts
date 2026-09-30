export type CollectionBuilderOption = {
  slug: string;
  label: string;
  visible: boolean;
  parentSlug?: string;
};

export type ProductBuilderOption = {
  slug: string;
  label: string;
};

export type OrderingProfileBuilderOption = {
  id: string;
  label: string;
  scopeType: string;
  /** True for the Global Ordering profile (default selection). */
  isGlobal: boolean;
};
