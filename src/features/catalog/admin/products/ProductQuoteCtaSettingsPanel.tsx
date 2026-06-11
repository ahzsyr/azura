"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ProductCtaCardLayout, ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import { validateProductCtaExternalUrl } from "@/features/products/lib/product-cta";
import { AdminSettingsRibbon } from "@/components/admin/layout/admin-settings-ribbon";
import { InternalLinkSelector } from "./InternalLinkSelector";
import { CtaIconUploadControls } from "./CtaIconUploadControls";
import { ProductCtaAppearanceFields } from "./ProductCtaAppearanceFields";
import { CtaLivePreview } from "./CtaLivePreview";

const QUOTE_SUB_TABS = [
  { id: "general", label: "General" },
  { id: "placements", label: "Placements" },
  { id: "page-style", label: "Page style" },
  { id: "card-style", label: "Card style" },
] as const;

type QuoteSubTab = (typeof QUOTE_SUB_TABS)[number]["id"];

export function ProductQuoteCtaSettingsPanel({
  locale,
  cta,
  setCta,
  externalHint,
  setExternalHint,
  onDirty,
}: {
  locale: string;
  cta: ResolvedProductCtaConfig;
  setCta: Dispatch<SetStateAction<ResolvedProductCtaConfig>>;
  externalHint: string | null;
  setExternalHint: (v: string | null) => void;
  onDirty?: () => void;
}) {
  const [subTab, setSubTab] = useState<QuoteSubTab>("general");

  const patch = (fn: SetStateAction<ResolvedProductCtaConfig>) => {
    setCta(fn);
    onDirty?.();
  };

  return (
    <section className="apm-dashboard-card apm-products-settings pm-storefront-cta" aria-labelledby="apm-quote-cta-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-quote-cta-h" className="apm-dashboard-card__title">
          Get Quote CTA
        </h2>
        <p className="apm-dashboard-card__lede">
          Secondary styled button on the product page (below title, floating bar) and optionally on catalog cards. Save
          from the top bar.
        </p>
      </header>

      <div className="apm-quote-cta__subtabs">
        <AdminSettingsRibbon
          tabs={[...QUOTE_SUB_TABS]}
          activeTab={subTab}
          onTabChange={(id) => setSubTab(id as QuoteSubTab)}
          layoutId="quote-cta-sub-ribbon"
          className="static top-0 z-10 border-b-0 bg-transparent backdrop-blur-none"
        />
      </div>

      <div className="pm-cta-layout pm-storefront-cta__layout">
        <div className="pm-cta-layout__main apm-cta-form-stack">
          {subTab === "general" && (
            <div className="pm-cta-band pm-cta-band--quote">
              <div className="apm-cta-form">
                <section className="apm-cta-form__section" aria-labelledby="qc-sec-button">
                  <h4 id="qc-sec-button" className="apm-cta-form__title">
                    Button
                  </h4>
                  <label className="apm-cta-form__status">
                    <input
                      type="checkbox"
                      checked={cta.enabled}
                      onChange={(e) => patch((c) => ({ ...c, enabled: e.target.checked }))}
                    />
                    <span className="apm-cta-form__status-text">
                      <strong>Enable Quote CTA</strong>
                      <span>Turn the quote button on or off site-wide (per placement on the Placements tab).</span>
                    </span>
                  </label>
                  <div className="apm-cta-form__row">
                    <label className="pm-cta-field">
                      <span>Button text</span>
                      <input
                        type="text"
                        value={cta.label}
                        onChange={(e) => patch((c) => ({ ...c, label: e.target.value }))}
                        placeholder="Get Quote"
                      />
                    </label>
                    <label className="pm-cta-field">
                      <span>Variant</span>
                      <select
                        value={cta.variant}
                        onChange={(e) =>
                          patch((c) => ({ ...c, variant: e.target.value as ResolvedProductCtaConfig["variant"] }))
                        }
                      >
                        {(["solid", "outline", "ghost", "link", "soft", "gradient"] as const).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="apm-cta-form__section" aria-labelledby="qc-sec-icon">
                  <h4 id="qc-sec-icon" className="apm-cta-form__title">
                    Icon
                  </h4>
                  <p className="apm-cta-form__hint">Custom image overrides Font Awesome when a URL is set.</p>
                  <CtaIconUploadControls
                    faIcon={cta.icon}
                    onFaIconChange={(v) => patch((c) => ({ ...c, icon: v }))}
                    iconUrl={cta.iconUrl}
                    onIconUrlChange={(v) => patch((c) => ({ ...c, iconUrl: v }))}
                    stacked
                  />
                </section>

                <section className="apm-cta-form__section" aria-labelledby="qc-sec-link">
                  <h4 id="qc-sec-link" className="apm-cta-form__title">
                    Link destination
                  </h4>
                  <div className="apm-cta-form__row apm-cta-form__row--1">
                    <label className="pm-cta-field">
                      <span>Link type</span>
                      <select
                        value={cta.linkType}
                        onChange={(e) =>
                          patch((c) => ({ ...c, linkType: e.target.value as ResolvedProductCtaConfig["linkType"] }))
                        }
                      >
                        <option value="internal">Internal (site page)</option>
                        <option value="external">External URL</option>
                      </select>
                    </label>
                    {cta.linkType === "internal" ? (
                      <>
                        <div className="pm-cta-field">
                          <span>Pick a page</span>
                          <InternalLinkSelector
                            locale={locale}
                            linkType={cta.linkType}
                            internalPath={cta.internalPath}
                            internalLink={cta.internalLink}
                            onPick={(path, ref) => patch((c) => ({ ...c, internalPath: path, internalLink: ref }))}
                            onClear={() =>
                              patch((c) => {
                                const next = { ...c };
                                delete next.internalLink;
                                return { ...next, internalPath: "" };
                              })
                            }
                          />
                        </div>
                        <label className="pm-cta-field">
                          <span>Path (editable)</span>
                          <input
                            type="text"
                            value={cta.internalPath}
                            onChange={(e) => patch((c) => ({ ...c, internalPath: e.target.value }))}
                            placeholder="/contact"
                          />
                        </label>
                      </>
                    ) : (
                      <label className="pm-cta-field">
                        <span>External URL</span>
                        <input
                          type="url"
                          value={cta.externalUrl}
                          onChange={(e) => {
                            patch((c) => ({ ...c, externalUrl: e.target.value }));
                            setExternalHint(null);
                          }}
                          onBlur={() => {
                            const v = validateProductCtaExternalUrl(cta.externalUrl);
                            setExternalHint(v.valid ? null : v.message ?? "Invalid URL");
                          }}
                          placeholder="https://…"
                        />
                        {externalHint ? <span className="pm-cta-field__err">{externalHint}</span> : null}
                      </label>
                    )}
                    <label className="apm-cta-form__check">
                      <input
                        type="checkbox"
                        checked={cta.openInNewTab}
                        onChange={(e) => patch((c) => ({ ...c, openInNewTab: e.target.checked }))}
                      />
                      Open link in new tab
                    </label>
                  </div>
                </section>
              </div>
            </div>
          )}

          {subTab === "placements" && (
            <div className="pm-cta-band">
              <div className="apm-cta-form">
                <section className="apm-cta-form__section" aria-labelledby="qc-sec-where">
                  <h4 id="qc-sec-where" className="apm-cta-form__title">
                    Where to show
                  </h4>
                  <div className="pm-cta-placements">
                    <label className="pm-cta-placements__item">
                      <input
                        type="checkbox"
                        checked={cta.placements.inline}
                        onChange={(e) =>
                          patch((c) => ({
                            ...c,
                            placements: { ...c.placements, inline: e.target.checked },
                          }))
                        }
                      />
                      <span>Product page (below title)</span>
                    </label>
                    <label className="pm-cta-placements__item">
                      <input
                        type="checkbox"
                        checked={cta.placements.floating}
                        onChange={(e) =>
                          patch((c) => ({
                            ...c,
                            placements: { ...c.placements, floating: e.target.checked },
                          }))
                        }
                      />
                      <span>Floating bar</span>
                    </label>
                    <label className="pm-cta-placements__item">
                      <input
                        type="checkbox"
                        checked={cta.placements.card}
                        onChange={(e) =>
                          patch((c) => ({
                            ...c,
                            placements: { ...c.placements, card: e.target.checked },
                          }))
                        }
                      />
                      <span>Product cards</span>
                    </label>
                  </div>
                </section>
                <section className="apm-cta-form__section" aria-labelledby="qc-sec-card">
                  <h4 id="qc-sec-card" className="apm-cta-form__title">
                    On product cards
                  </h4>
                  <div className="apm-cta-form__row">
                    <label className="pm-cta-field">
                      <span>Card visibility</span>
                      <select
                        value={cta.cardVisibility}
                        onChange={(e) =>
                          patch((c) => ({
                            ...c,
                            cardVisibility: e.target.value as ResolvedProductCtaConfig["cardVisibility"],
                          }))
                        }
                      >
                        <option value="always">Always visible</option>
                        <option value="hover">Hover only (desktop)</option>
                      </select>
                    </label>
                    <label className="pm-cta-field">
                      <span>Card layout</span>
                      <select
                        value={cta.cardLayout}
                        onChange={(e) =>
                          patch((c) => ({
                            ...c,
                            cardLayout: e.target.value as ProductCtaCardLayout,
                          }))
                        }
                      >
                        <option value="floating_corner">Floating corner</option>
                        <option value="overlay">Overlay on image</option>
                        <option value="bottom_bar">Bottom bar</option>
                        <option value="inline_meta">Inline with price</option>
                        <option value="quick_action">Quick action chip</option>
                      </select>
                    </label>
                  </div>
                </section>
              </div>
            </div>
          )}

          {subTab === "page-style" && (
            <div className="pm-cta-band">
              <ProductCtaAppearanceFields
                context="page"
                value={cta.appearance.page}
                variant={cta.variant}
                onVariantChange={(v) => patch((c) => ({ ...c, variant: v }))}
                onChange={(next) =>
                  patch((c) => ({
                    ...c,
                    appearance: { ...c.appearance, page: next },
                  }))
                }
              />
            </div>
          )}

          {subTab === "card-style" && (
            <div className="pm-cta-band">
              <ProductCtaAppearanceFields
                context="card"
                value={cta.appearance.card}
                variant={cta.variant}
                onVariantChange={(v) => patch((c) => ({ ...c, variant: v }))}
                onChange={(next) =>
                  patch((c) => ({
                    ...c,
                    appearance: { ...c.appearance, card: next },
                  }))
                }
              />
            </div>
          )}
        </div>

        <aside className="pm-cta-layout__aside pm-storefront-cta__preview" aria-label="Quote CTA preview">
          <CtaLivePreview cfg={cta} />
        </aside>
      </div>
    </section>
  );
}
