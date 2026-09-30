/** Compact card snapshot stored in SearchDocument.metadata.card at index time. */
export type SearchCardPayload = {
  imageUrl?: string;
  price?: { min: number; max?: number; currency?: string };
  brand?: string;
  rating?: { value: number; count: number };
  productCount?: number;
  readTimeMinutes?: number;
  updatedAt?: string;
  badges?: string[];
  inStock?: boolean;
  slug?: string;
};
