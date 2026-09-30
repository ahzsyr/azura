import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductCardPricingMode } from "./product-card-design.types";

export interface ProductCardPriceDisplay {
  sale: number;
  compare: number | null;
  currency: string;
  discountPercent: number;
  savingsAmount: number;
  showCompare: boolean;
  showSavings: boolean;
  showInstallments: boolean;
  installmentLabel: string | null;
}

export function computeDiscount(sale: number, compare: number | null | undefined): {
  discountPercent: number;
  savingsAmount: number;
} {
  if (compare == null || compare <= sale) return { discountPercent: 0, savingsAmount: 0 };
  const savingsAmount = compare - sale;
  const discountPercent = Math.round((savingsAmount / compare) * 100);
  return { discountPercent, savingsAmount };
}

export function resolveProductCardPriceDisplay(
  product: ProductListingRecord,
  mode: ProductCardPricingMode,
): ProductCardPriceDisplay {
  const sale = product.price.value;
  const compare = product.old_price ?? null;
  const { discountPercent, savingsAmount } = computeDiscount(sale, compare);

  const base = {
    sale,
    compare,
    currency: product.price.currency,
    discountPercent,
    savingsAmount,
    showInstallments: false,
    installmentLabel: null as string | null,
  };

  switch (mode) {
    case "minimal":
      return { ...base, showCompare: false, showSavings: false };
    case "retail":
      return { ...base, showCompare: compare != null && compare > sale, showSavings: discountPercent > 0 };
    case "marketplace":
      return {
        ...base,
        showCompare: compare != null && compare > sale,
        showSavings: discountPercent > 0,
        showInstallments: false,
      };
    case "luxury":
      return { ...base, showCompare: false, showSavings: false };
    case "enterprise":
      return {
        ...base,
        showCompare: compare != null && compare > sale,
        showSavings: savingsAmount > 0,
      };
    default:
      return { ...base, showCompare: false, showSavings: false };
  }
}

export function formatCardPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
