import Link from "next/link";
import type { ResolvedProductPromo } from "@/features/products/lib/product-page-display";

type Props = {
  promo: ResolvedProductPromo;
  locale: string;
};

export function ProductPromoBanner({ promo, locale }: Props) {
  if (!promo.enabled) return null;

  const href = promo.ctaHref.startsWith("/")
    ? promo.ctaHref.startsWith(`/${locale}`)
      ? promo.ctaHref
      : `/${locale}${promo.ctaHref.replace(/^\//, "")}`
    : promo.ctaHref;

  return (
    <section className="prd-promo" aria-label="Promotion">
      <div className="prd-promo__inner">
        <div className="prd-promo__copy">
          {promo.eyebrow ? <p className="prd-promo__eyebrow">{promo.eyebrow}</p> : null}
          <h2 className="prd-promo__title">{promo.title}</h2>
          {promo.subtitle ? <p className="prd-promo__sub">{promo.subtitle}</p> : null}
        </div>
        {promo.ctaLabel && promo.ctaHref ? (
          <Link
            className="prd-promo__cta"
            href={href}
            target={promo.openInNewTab ? "_blank" : undefined}
            rel={promo.openInNewTab ? "noopener noreferrer" : undefined}
          >
            {promo.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
