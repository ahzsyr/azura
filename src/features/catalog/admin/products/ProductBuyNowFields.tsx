import type { Dispatch, SetStateAction } from "react";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import { previewBuyNowHref } from "@/features/products/lib/product-buy-now";

export function ProductBuyNowFields({
  value,
  onChange,
  sampleSlug = "sample-product",
}: {
  value: ResolvedProductBuyNow;
  onChange: Dispatch<SetStateAction<ResolvedProductBuyNow>>;
  sampleSlug?: string;
}) {
  const preview = previewBuyNowHref(value, sampleSlug);

  return (
    <div className="apm-cta-form">
      <section className="apm-cta-form__section" aria-labelledby="bn-sec-button">
        <h4 id="bn-sec-button" className="apm-cta-form__title">
          Button
        </h4>
        <label className="apm-cta-form__status">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange((c) => ({ ...c, enabled: e.target.checked }))}
          />
          <span className="apm-cta-form__status-text">
            <strong>Enable Buy Now</strong>
            <span>Show the shop link button on the storefront when placements below are on.</span>
          </span>
        </label>
        <div className="apm-cta-form__row apm-cta-form__row--1">
          <label className="pm-cta-field">
            <span>Button label</span>
            <input
              type="text"
              value={value.label}
              onChange={(e) => onChange((c) => ({ ...c, label: e.target.value }))}
              placeholder="Buy Now"
            />
          </label>
        </div>
      </section>

      <section className="apm-cta-form__section" aria-labelledby="bn-sec-link">
        <h4 id="bn-sec-link" className="apm-cta-form__title">
          Link destination
        </h4>
        <div className="apm-cta-form__row apm-cta-form__row--1">
          <label className="pm-cta-field">
            <span>Destination type</span>
            <select
              value={value.destinationType}
              onChange={(e) =>
                onChange((c) => ({
                  ...c,
                  destinationType: e.target.value as ResolvedProductBuyNow["destinationType"],
                }))
              }
            >
              <option value="shop">Shop link</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
        </div>
        {value.destinationType === "whatsapp" ? (
          <div className="apm-cta-form__row apm-cta-form__row--1">
            <p className="apm-cta-form__hint">
              Opens WhatsApp with a message that includes each product&apos;s title.
            </p>
            <label className="pm-cta-field">
              <span>WhatsApp phone number</span>
              <input
                type="tel"
                value={value.whatsappPhone}
                onChange={(e) => onChange((c) => ({ ...c, whatsappPhone: e.target.value }))}
                placeholder="971554727292"
              />
            </label>
            <label className="pm-cta-field">
              <span>Message template</span>
              <textarea
                rows={3}
                value={value.whatsappMessage}
                onChange={(e) => onChange((c) => ({ ...c, whatsappMessage: e.target.value }))}
                placeholder="Hi, I'm interested in {productTitle}"
              />
            </label>
            <p className="apm-cta-form__hint">
              Use {"{productTitle}"}, {"{productSlug}"}, or {"{productSku}"} — replaced per product.
            </p>
            {preview ? (
              <p className="apm-cta-form__preview">
                <span className="apm-cta-form__preview-label">Example URL</span>
                <code>{preview}</code>
              </p>
            ) : (
              <p className="apm-cta-form__preview apm-cta-form__preview--muted">
                Set WhatsApp phone number to preview a sample link.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="apm-cta-form__hint">
              Built for every product as: shop domain + path prefix + product slug (or per-product override in the editor).
            </p>
            <div className="apm-cta-form__row apm-cta-form__row--1">
              <label className="pm-cta-field">
                <span>Shop domain / base URL</span>
                <input
                  type="url"
                  value={value.shopBaseUrl}
                  onChange={(e) => onChange((c) => ({ ...c, shopBaseUrl: e.target.value }))}
                  placeholder="https://shop.example.com"
                />
              </label>
              <label className="pm-cta-field">
                <span>Slug path prefix</span>
                <input
                  type="text"
                  value={value.slugPathPrefix}
                  onChange={(e) => onChange((c) => ({ ...c, slugPathPrefix: e.target.value }))}
                  placeholder="/"
                />
              </label>
              {preview ? (
                <p className="apm-cta-form__preview">
                  <span className="apm-cta-form__preview-label">Example URL</span>
                  <code>{preview}</code>
                </p>
              ) : (
                <p className="apm-cta-form__preview apm-cta-form__preview--muted">
                  Set shop domain to preview a sample link.
                </p>
              )}
            </div>
          </>
        )}
        <label className="apm-cta-form__check">
          <input
            type="checkbox"
            checked={value.openInNewTab}
            onChange={(e) => onChange((c) => ({ ...c, openInNewTab: e.target.checked }))}
          />
          Open link in new tab
        </label>
      </section>

      <section className="apm-cta-form__section" aria-labelledby="bn-sec-placements">
        <h4 id="bn-sec-placements" className="apm-cta-form__title">
          Placements
        </h4>
        <div className="pm-cta-placements">
          <label className="pm-cta-placements__item">
            <input
              type="checkbox"
              checked={value.placements.page}
              onChange={(e) =>
                onChange((c) => ({
                  ...c,
                  placements: { ...c.placements, page: e.target.checked },
                }))
              }
            />
            <span>Product page (buy box)</span>
          </label>
          <label className="pm-cta-placements__item">
            <input
              type="checkbox"
              checked={value.placements.card}
              onChange={(e) =>
                onChange((c) => ({
                  ...c,
                  placements: { ...c.placements, card: e.target.checked },
                }))
              }
            />
            <span>Product cards (catalog)</span>
          </label>
        </div>
      </section>
    </div>
  );
}

export function ProductBuyNowChromeFields({
  value,
  onChange,
}: {
  value: ResolvedProductBuyNow;
  onChange: Dispatch<SetStateAction<ResolvedProductBuyNow>>;
}) {
  return (
    <div className="apm-cta-form">
      <section className="apm-cta-form__section" aria-labelledby="bn-sec-chrome">
        <h4 id="bn-sec-chrome" className="apm-cta-form__title">
          Appearance
        </h4>
        <div className="apm-cta-form__row">
          <label className="pm-cta-field">
            <span>Variant</span>
            <select
              value={value.variant}
              onChange={(e) =>
                onChange((c) => ({
                  ...c,
                  variant: e.target.value as ResolvedProductBuyNow["variant"],
                }))
              }
            >
              <option value="primary">Primary</option>
              <option value="outline">Outline</option>
            </select>
          </label>
          <label className="pm-cta-field">
            <span>Size</span>
            <select
              value={value.size}
              onChange={(e) =>
                onChange((c) => ({
                  ...c,
                  size: e.target.value as ResolvedProductBuyNow["size"],
                }))
              }
            >
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>
        </div>
        <label className="apm-cta-form__check">
          <input
            type="checkbox"
            checked={value.fullWidth}
            onChange={(e) => onChange((c) => ({ ...c, fullWidth: e.target.checked }))}
          />
          Full width on product page buy box
        </label>
      </section>
    </div>
  );
}
