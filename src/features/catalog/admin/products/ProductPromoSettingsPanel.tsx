import type { Dispatch, SetStateAction } from "react";
import type { ResolvedProductPromo } from "@/features/products/lib/product-page-display";
import { InternalLinkSelector } from "./InternalLinkSelector";

export function ProductPromoSettingsPanel({
  locale,
  promo,
  setPromo,
  onDirty,
}: {
  locale: string;
  promo: ResolvedProductPromo;
  setPromo: Dispatch<SetStateAction<ResolvedProductPromo>>;
  onDirty?: () => void;
}) {
  const patch = (next: ResolvedProductPromo) => {
    setPromo(next);
    onDirty?.();
  };

  const previewHref = promo.ctaHref.startsWith("/")
    ? promo.ctaHref
    : promo.ctaHref
      ? `/${locale}${promo.ctaHref.replace(/^\//, "")}`
      : "#";

  return (
    <section className="apm-dashboard-card apm-products-settings apm-promo-settings" aria-labelledby="apm-promo-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-promo-h" className="apm-dashboard-card__title">
          Default promo banner
        </h2>
        <p className="apm-dashboard-card__lede">
          Event or campaign strip on the product detail page main column. Toggle visibility on the{" "}
          <a href="#product-page">Product Page</a> tab. Save from the top bar.
        </p>
      </header>
      <div className="pm-cta-layout apm-promo-settings__layout">
        <div className="pm-cta-layout__main">
          <div className="pm-cta-band">
            <label className="pm-cta-field pm-cta-field--toggle pm-span-2">
              <span>Enable promo banner</span>
              <input
                type="checkbox"
                checked={promo.enabled}
                onChange={(e) => patch({ ...promo, enabled: e.target.checked })}
              />
            </label>
            <div className="pm-cta-grid">
              <label className="pm-cta-field">
                <span>Eyebrow</span>
                <input
                  value={promo.eyebrow}
                  maxLength={80}
                  onChange={(e) => patch({ ...promo, eyebrow: e.target.value })}
                  placeholder="Events"
                />
              </label>
              <label className="pm-cta-field pm-span-2">
                <span>Title</span>
                <input
                  value={promo.title}
                  onChange={(e) => patch({ ...promo, title: e.target.value })}
                  placeholder="Promo headline"
                />
              </label>
              <label className="pm-cta-field pm-span-2">
                <span>Subtitle</span>
                <textarea
                  value={promo.subtitle}
                  rows={3}
                  onChange={(e) => patch({ ...promo, subtitle: e.target.value })}
                  placeholder="Supporting copy"
                />
              </label>
              <label className="pm-cta-field">
                <span>CTA label</span>
                <input
                  value={promo.ctaLabel}
                  onChange={(e) => patch({ ...promo, ctaLabel: e.target.value })}
                  placeholder="Learn more"
                />
              </label>
              <div className="pm-cta-field pm-span-2">
                <span>CTA destination</span>
                <InternalLinkSelector
                  locale={locale}
                  linkType="internal"
                  internalPath={promo.ctaHref}
                  onPick={(path) => patch({ ...promo, ctaHref: path })}
                  onClear={() => patch({ ...promo, ctaHref: "" })}
                />
                <label className="pm-cta-subfield">
                  <span>Path (editable)</span>
                  <input
                    type="text"
                    value={promo.ctaHref}
                    onChange={(e) => patch({ ...promo, ctaHref: e.target.value })}
                    placeholder="/about"
                  />
                </label>
              </div>
              <label className="pm-cta-field pm-cta-field--toggle">
                <span>Open CTA in new tab</span>
                <input
                  type="checkbox"
                  checked={promo.openInNewTab}
                  onChange={(e) => patch({ ...promo, openInNewTab: e.target.checked })}
                />
              </label>
            </div>
          </div>
        </div>
        <aside className="pm-cta-layout__aside apm-promo-settings__preview">
          <div className="apm-preview-cap">Storefront preview</div>
          <div className={`apm-pdp-preview${promo.enabled ? "" : " is-disabled"}`}>
            {promo.enabled ? (
              <section className="prd-promo" aria-label="Promotion preview">
                <div className="prd-promo__inner">
                  <div className="prd-promo__copy">
                    {promo.eyebrow ? <p className="prd-promo__eyebrow">{promo.eyebrow}</p> : null}
                    <h2 className="prd-promo__title">{promo.title || "Promo title"}</h2>
                    {promo.subtitle ? <p className="prd-promo__sub">{promo.subtitle}</p> : null}
                  </div>
                  {promo.ctaLabel && promo.ctaHref ? (
                    <span className="prd-promo__cta">{promo.ctaLabel}</span>
                  ) : null}
                </div>
              </section>
            ) : (
              <p className="pm-cta-prev__muted">Promo banner is disabled.</p>
            )}
            {promo.ctaHref ? (
              <p className="apm-preview-path">
                Link: <code>{previewHref}</code>
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
