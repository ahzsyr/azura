import type { ProductCtaCardLayout, ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import { validateProductCtaExternalUrl } from "@/features/products/lib/product-cta";
import { InternalLinkSelector } from "./InternalLinkSelector";
import { CtaLivePreview } from "./CtaLivePreview";
import { CtaIconUploadControls } from "./CtaIconUploadControls";

export function GlobalStorefrontCtaForm({
  locale,
  globalCta,
  setGlobalCta,
  globalExternalHint,
  setGlobalExternalHint,
  ctaSaving,
  ctaFeedback,
  onSave,
}: {
  locale: string;
  globalCta: ResolvedProductCtaConfig;
  setGlobalCta: React.Dispatch<React.SetStateAction<ResolvedProductCtaConfig>>;
  globalExternalHint: string | null;
  setGlobalExternalHint: (v: string | null) => void;
  ctaSaving: boolean;
  ctaFeedback: { kind: "ok" | "err"; text: string } | null;
  onSave: () => void;
}) {
  return (
    <section className="apm-dashboard-card" aria-labelledby="apm-cta-heading">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-cta-heading" className="apm-dashboard-card__title">
          General product settings — storefront CTA
        </h2>
        <p className="apm-dashboard-card__lede">
          Global defaults for the product detail button and optional product-card actions. Per-product values in the editor merge on top (empty
          fields = inherit these defaults).
        </p>
      </header>
      <div className="pm-cta-layout">
        <div className="pm-cta-layout__main">
          <div className="pm-cta-band">
            <h3 className="pm-cta-band__title">Global</h3>
            <div className="pm-cta-grid">
              <label className="pm-cta-field">
                <span>Enable CTA</span>
                <input
                  type="checkbox"
                  checked={globalCta.enabled}
                  onChange={(e) => setGlobalCta((c) => ({ ...c, enabled: e.target.checked }))}
                />
              </label>
              <label className="pm-cta-field">
                <span>Button text</span>
                <input
                  type="text"
                  value={globalCta.label}
                  onChange={(e) => setGlobalCta((c) => ({ ...c, label: e.target.value }))}
                  placeholder="Shop now"
                />
              </label>
              <div className="pm-cta-field pm-span-2">
                <CtaIconUploadControls
                  faIcon={globalCta.icon}
                  onFaIconChange={(v) => setGlobalCta((c) => ({ ...c, icon: v }))}
                  iconUrl={globalCta.iconUrl}
                  onIconUrlChange={(v) => setGlobalCta((c) => ({ ...c, iconUrl: v }))}
                />
              </div>
              <label className="pm-cta-field">
                <span>Variant</span>
                <select
                  value={globalCta.variant}
                  onChange={(e) => setGlobalCta((c) => ({ ...c, variant: e.target.value as ResolvedProductCtaConfig["variant"] }))}
                >
                  {(["solid", "outline", "ghost", "link", "soft", "gradient"] as const).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="pm-cta-band">
            <h3 className="pm-cta-band__title">Link target</h3>
            <div className="pm-cta-grid">
              <label className="pm-cta-field pm-span-2">
                <span>Link type</span>
                <select
                  value={globalCta.linkType}
                  onChange={(e) => setGlobalCta((c) => ({ ...c, linkType: e.target.value as ResolvedProductCtaConfig["linkType"] }))}
                >
                  <option value="internal">Internal (site)</option>
                  <option value="external">External URL</option>
                </select>
              </label>
              {globalCta.linkType === "internal" ? (
                <div className="pm-cta-field pm-span-2">
                  <span>Internal destination</span>
                  <InternalLinkSelector
                    locale={locale}
                    linkType={globalCta.linkType}
                    internalPath={globalCta.internalPath}
                    internalLink={globalCta.internalLink}
                    onPick={(path, ref) =>
                      setGlobalCta((c) => ({
                        ...c,
                        internalPath: path,
                        internalLink: ref,
                      }))
                    }
                    onClear={() =>
                      setGlobalCta((c) => {
                        const next = { ...c };
                        delete next.internalLink;
                        return { ...next, internalPath: "" };
                      })
                    }
                  />
                  <label className="pm-cta-subfield">
                    <span>Path (editable)</span>
                    <input
                      type="text"
                      value={globalCta.internalPath}
                      onChange={(e) => setGlobalCta((c) => ({ ...c, internalPath: e.target.value }))}
                      placeholder="/contact"
                      aria-label="Internal path without locale prefix"
                    />
                  </label>
                  <label className="pm-cta-field pm-inline-check pm-span-2 pm-cta-subfield">
                    <input
                      type="checkbox"
                      checked={globalCta.openInNewTab}
                      onChange={(e) => setGlobalCta((c) => ({ ...c, openInNewTab: e.target.checked }))}
                    />
                    Open in new tab
                  </label>
                </div>
              ) : (
                <>
                  <label className="pm-cta-field pm-span-2">
                    <span>External URL</span>
                    <input
                      type="url"
                      value={globalCta.externalUrl}
                      onChange={(e) => {
                        setGlobalCta((c) => ({ ...c, externalUrl: e.target.value }));
                        setGlobalExternalHint(null);
                      }}
                      onBlur={() => {
                        const v = validateProductCtaExternalUrl(globalCta.externalUrl);
                        setGlobalExternalHint(v.valid ? null : v.message ?? "Invalid URL");
                      }}
                      placeholder="https://…"
                      aria-invalid={Boolean(globalExternalHint)}
                      aria-describedby={globalExternalHint ? "pm-ext-url-hint-global" : undefined}
                    />
                    {globalExternalHint ? (
                      <span id="pm-ext-url-hint-global" className="pm-cta-field__err" role="alert">
                        {globalExternalHint}
                      </span>
                    ) : null}
                  </label>
                  <label className="pm-cta-field pm-inline-check">
                    <input
                      type="checkbox"
                      checked={globalCta.openInNewTab}
                      onChange={(e) => setGlobalCta((c) => ({ ...c, openInNewTab: e.target.checked }))}
                    />
                    Open in new tab
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="pm-cta-band">
            <h3 className="pm-cta-band__title">Placements &amp; visibility</h3>
            <p className="apm-fieldset__hint pm-span-all" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
              Floating uses the product CTA appearance &quot;Position mode&quot; on the <strong>Product page appearance</strong> tab. Card chip
              visibility can be hover-only on desktop.
            </p>
            <div className="pm-cta-grid">
              <label className="pm-cta-field pm-inline-check">
                <input
                  type="checkbox"
                  checked={globalCta.placements.inline}
                  onChange={(e) =>
                    setGlobalCta((c) => ({
                      ...c,
                      placements: { ...c.placements, inline: e.target.checked },
                    }))
                  }
                />
                Product page (price area)
              </label>
              <label className="pm-cta-field pm-inline-check">
                <input
                  type="checkbox"
                  checked={globalCta.placements.floating}
                  onChange={(e) =>
                    setGlobalCta((c) => ({
                      ...c,
                      placements: { ...c.placements, floating: e.target.checked },
                    }))
                  }
                />
                Floating on product page
              </label>
              <label className="pm-cta-field pm-inline-check">
                <input
                  type="checkbox"
                  checked={globalCta.placements.card}
                  onChange={(e) =>
                    setGlobalCta((c) => ({
                      ...c,
                      placements: { ...c.placements, card: e.target.checked },
                    }))
                  }
                />
                Product cards (catalog)
              </label>
              <label className="pm-cta-field">
                <span>Card visibility</span>
                <select
                  value={globalCta.cardVisibility}
                  onChange={(e) =>
                    setGlobalCta((c) => ({
                      ...c,
                      cardVisibility: e.target.value as ResolvedProductCtaConfig["cardVisibility"],
                    }))
                  }
                >
                  <option value="always">Always visible</option>
                  <option value="hover">Hover only (desktop)</option>
                </select>
              </label>
              <label className="pm-cta-field pm-span-2">
                <span>Card layout</span>
                <select
                  value={globalCta.cardLayout}
                  onChange={(e) =>
                    setGlobalCta((c) => ({
                      ...c,
                      cardLayout: e.target.value as ProductCtaCardLayout,
                    }))
                  }
                >
                  <option value="floating_corner">Floating corner</option>
                  <option value="overlay">Overlay on image</option>
                  <option value="bottom_bar">Bottom bar</option>
                  <option value="inline_meta">Inline with price row</option>
                  <option value="quick_action">Quick action chip</option>
                </select>
              </label>
            </div>
          </div>

          <div className="pm-cta-actions">
            <button type="button" disabled={ctaSaving} onClick={onSave}>
              {ctaSaving ? "Saving…" : "Save storefront CTA"}
            </button>
            {ctaFeedback ? (
              <p className={ctaFeedback.kind === "ok" ? "pm-cta-actions__ok" : "pm-cta-actions__err"}>{ctaFeedback.text}</p>
            ) : null}
          </div>
        </div>
        <aside className="pm-cta-layout__aside" aria-label="CTA preview">
          <CtaLivePreview cfg={globalCta} />
        </aside>
      </div>
    </section>
  );
}
