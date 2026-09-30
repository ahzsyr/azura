import type { GoogleShoppingFeedProductInput } from "../google-shopping-feed.types";
import type { GoogleShoppingMarket } from "../google-shopping-feed.types";
import { DEFAULT_GOOGLE_SHOPPING_MARKET } from "../google-shopping-market";

export function sampleMarket(
  overrides: Partial<GoogleShoppingMarket> = {},
): GoogleShoppingMarket {
  return {
    ...DEFAULT_GOOGLE_SHOPPING_MARKET,
    siteOrigin: "https://brt-me.com",
    localePrefix: "en",
    feedUrl: "https://brt-me.com/feeds/google-shopping.xml",
    shippingCountry: "AE",
    shippingService: "Standard",
    shippingPrice: 0,
    ...overrides,
  };
}

export function sampleProduct(
  overrides: Partial<GoogleShoppingFeedProductInput> = {},
): GoogleShoppingFeedProductInput {
  return {
    id: "sku-rb5009",
    slug: "mikrotik-rb5009",
    productTitle: "MikroTik RB5009UG+S+IN",
    name: "MikroTik RB5009UG+S+IN",
    description: "9-port Gigabit router with 2.5G SFP+",
    short_description: "High-performance MikroTik router",
    price: { value: 499, currency: "AED" },
    availability: "InStock",
    stock_status: "in_stock",
    brand: "MikroTik",
    ean: "4752224001234",
    mpn: "RB5009UG+S+IN",
    mainCategory: "Networking",
    condition_options: ["new"],
    media: {
      images: [
        { url: "https://cdn.example.com/rb5009.jpg", type: "main", alt: "Router" },
        { url: "https://cdn.example.com/rb5009-side.jpg", type: "gallery", alt: "Side" },
      ],
    },
    reviews: { rating: 0, count: 0 },
    publishStatus: "published",
    googleProductCategory: "278",
    ...overrides,
  };
}
