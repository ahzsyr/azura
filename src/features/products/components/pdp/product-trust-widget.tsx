import type { CSSProperties } from "react";
import type { ResolvedProductTrust } from "@/features/products/lib/product-page-display";

type Props = {
  trust: ResolvedProductTrust;
  numberLocale?: string;
};

export function ProductTrustWidget({ trust, numberLocale = "en-US" }: Props) {
  if (!trust.enabled) return null;

  const pct = Math.min(100, Math.max(0, (trust.rating / 5) * 100));
  const stars = "★★★★★";

  const inner = (
    <div className="prd-trust__inner">
      <div className="prd-trust__brand">
        <span className="prd-trust__logo" aria-hidden="true">
          ★
        </span>
        <span className="prd-trust__name">{trust.provider}</span>
      </div>
      <div className="prd-trust__score">
        <span className="prd-trust__label">{trust.label}</span>
        <span className="prd-trust__rating">{trust.rating.toFixed(1)}</span>
        <span className="prd-trust__stars" style={{ "--rating": `${pct}%` } as CSSProperties} aria-hidden="true">
          {stars}
        </span>
        <span className="prd-trust__count">
          Based on {trust.reviewCount.toLocaleString(numberLocale)} reviews
        </span>
      </div>
    </div>
  );

  if (trust.href) {
    return (
      <a className="prd-trust" href={trust.href} target="_blank" rel="noopener noreferrer" aria-label={`Customer reviews on ${trust.provider}`}>
        {inner}
      </a>
    );
  }

  return (
    <section className="prd-trust" aria-label={`Customer reviews on ${trust.provider}`}>
      {inner}
    </section>
  );
}
