"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { ProductPriceDisplay } from "@/features/products/components/pdp/product-price-display";
import type { ProductBoughtTogetherItem } from "@/features/products/types";
import type { ShopperCurrencyContext } from "@/features/products/lib/currency/types";

type Props = {
  items: ProductBoughtTogetherItem[];
  currencyCtx: ShopperCurrencyContext;
  displayCode: string;
  numberLocale: string;
};

function accessoryHref(item: ProductBoughtTogetherItem): string | null {
  const url = item.url?.trim();
  if (url) {
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith("/") ? url : `/${url}`;
  }
  const slug = item.slug?.trim();
  return slug ? `/products/${slug}` : null;
}

export function UniFiAccessories({ items, currencyCtx, displayCode, numberLocale }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="unifi-accessories">
      <div className="unifi-accessories__heading">Powerful Accessories</div>
      <div className="unifi-accessories__track">
        {items.map((item, index) => {
          const href = accessoryHref(item);
          const name = item.name || item.title || "Accessory";
          const price = typeof item.price === "number" ? item.price : null;
          return (
            <div key={`${name}-${index}`} className="unifi-accessories__card">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="unifi-accessories__thumb" />
              ) : (
                <div className="unifi-accessories__thumb unifi-accessories__thumb--empty" />
              )}
              <div className="unifi-accessories__meta">
                {href ? (
                  <Link href={href} className="unifi-accessories__name">
                    {name}
                  </Link>
                ) : (
                  <span className="unifi-accessories__name">{name}</span>
                )}
                {price != null ? (
                  <>
                    <ProductPriceDisplay
                      ctx={currencyCtx}
                      amount={price}
                      displayCode={item.currency || displayCode}
                      numberLocale={numberLocale}
                      className="unifi-accessories__price"
                    />
                    <span className="unifi-accessories__vat">VAT &amp; Surcharge incl.</span>
                  </>
                ) : null}
              </div>
              {href ? (
                <Link href={href} className="unifi-accessories__add" aria-label={`Add ${name}`}>
                  <ShoppingCart size={16} />
                </Link>
              ) : (
                <span className="unifi-accessories__add unifi-accessories__add--disabled">
                  <ShoppingCart size={16} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
