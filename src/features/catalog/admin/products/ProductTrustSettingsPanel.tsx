import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { ResolvedProductTrust } from "@/features/products/lib/product-page-display";

const TRUST_PRESETS = ["Trustpilot", "Google", "Custom"] as const;

export function ProductTrustSettingsPanel({
  trust,
  setTrust,
  onDirty,
}: {
  trust: ResolvedProductTrust;
  setTrust: Dispatch<SetStateAction<ResolvedProductTrust>>;
  onDirty?: () => void;
}) {
  const patch = (next: ResolvedProductTrust) => {
    setTrust(next);
    onDirty?.();
  };

  const pct = Math.min(100, Math.max(0, (trust.rating / 5) * 100));
  const stars = "★★★★★";

  return (
    <section className="apm-dashboard-card apm-products-settings apm-trust-settings" aria-labelledby="apm-trust-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-trust-h" className="apm-dashboard-card__title">
          Default trust widget
        </h2>
        <p className="apm-dashboard-card__lede">
          Review summary block on the product page. Toggle visibility on the{" "}
          <a href="#product-page">Product Page</a> tab. Save from the top bar.
        </p>
      </header>
      <div className="pm-cta-layout apm-trust-settings__layout">
        <div className="pm-cta-layout__main">
          <div className="pm-cta-band">
            <label className="pm-cta-field pm-cta-field--toggle pm-span-2">
              <span>Enable trust widget</span>
              <input
                type="checkbox"
                checked={trust.enabled}
                onChange={(e) => patch({ ...trust, enabled: e.target.checked })}
              />
            </label>
            <div className="pm-cta-grid">
              <label className="pm-cta-field">
                <span>Provider preset</span>
                <select
                  value={
                    TRUST_PRESETS.includes(trust.provider as (typeof TRUST_PRESETS)[number])
                      ? trust.provider
                      : "Custom"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "Custom") patch({ ...trust, provider: v });
                  }}
                >
                  {TRUST_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pm-cta-field">
                <span>Provider name</span>
                <input
                  value={trust.provider}
                  onChange={(e) => patch({ ...trust, provider: e.target.value })}
                  placeholder="Trustpilot"
                />
              </label>
              <label className="pm-cta-field">
                <span>Label</span>
                <input
                  value={trust.label}
                  onChange={(e) => patch({ ...trust, label: e.target.value })}
                  placeholder="Excellent"
                />
              </label>
              <label className="pm-cta-field pm-span-2">
                <span>
                  Rating: {trust.rating.toFixed(1)} / 5
                </span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={trust.rating}
                  onChange={(e) => patch({ ...trust, rating: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={trust.rating}
                  onChange={(e) => patch({ ...trust, rating: Number(e.target.value) })}
                />
              </label>
              <label className="pm-cta-field">
                <span>Review count</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={trust.reviewCount}
                  onChange={(e) => patch({ ...trust, reviewCount: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <label className="pm-cta-field pm-span-2">
                <span>Link (optional)</span>
                <input
                  type="url"
                  value={trust.href}
                  onChange={(e) => patch({ ...trust, href: e.target.value })}
                  placeholder="https://…"
                />
              </label>
            </div>
          </div>
        </div>
        <aside className="pm-cta-layout__aside apm-trust-settings__preview">
          <div className="apm-preview-cap">Storefront preview</div>
          <div className={`apm-pdp-preview${trust.enabled ? "" : " is-disabled"}`}>
            {trust.enabled ? (
              <section className="prd-trust" aria-label="Trust preview">
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
                    <span
                      className="prd-trust__stars"
                      style={{ "--rating": `${pct}%` } as CSSProperties}
                      aria-hidden="true"
                    >
                      {stars}
                    </span>
                    <span className="prd-trust__count">
                      Based on {trust.reviewCount.toLocaleString()} reviews
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <p className="pm-cta-prev__muted">Trust widget is disabled.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
