"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import { ProductPriceDisplay } from "@/features/products/components/pdp/product-price-display";
import { ProductStickyLayoutInit } from "@/features/products/components/pdp/product-sticky-layout-init";
import type { Product } from "@/features/products/types";
import { UniFiGalleryZoom } from "../unifi/unifi-gallery-zoom";
import "./mikrotik-pdp.css";

type Props = {
  viewModel: ProductDetailViewModel;
};

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mikrotik-pdp__accordion">
      <button
        type="button"
        className="mikrotik-pdp__accordion-header"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`mikrotik-pdp__accordion-chevron${open ? " is-open" : ""}`} aria-hidden>
          ▾
        </span>
        <span>{title}</span>
      </button>
      {open ? <div className="mikrotik-pdp__accordion-body">{children}</div> : null}
    </div>
  );
}

function SpecGroups({ product }: { product: Product }) {
  const groups = product.specifications || [];
  if (!groups.length) return null;
  return (
    <>
      {groups.map((group) => {
        const items = group.items || [];
        if (!items.length) return null;
        return (
          <div key={group.technology || "group"} className="mikrotik-pdp__spec-group">
            <div className="mikrotik-pdp__spec-label">{group.technology}</div>
            <ul className="mikrotik-pdp__spec-rows">
              {items.map((item) => (
                <li key={`${item.name}-${item.value}`}>
                  <span>{item.name}</span>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function MarketingSections({
  product,
  overviewEnabled,
}: {
  product: Product;
  overviewEnabled: boolean;
}) {
  if (!overviewEnabled) return null;

  const sections = (product.detailed_description || []).filter(
    (s) => (s.tab || "overview") === "overview",
  );
  const featureSection = sections.find(
    (s) => (s.heading || "").toLowerCase() === "features" && (s.features?.length || 0) > 0,
  );
  const videoSection = sections.find((s) => (s.videos?.length || 0) > 0);
  const others = sections.filter(
    (s) => s !== featureSection && s !== videoSection && (s.heading || "").toLowerCase() !== "highlights",
  );

  return (
    <>
      {videoSection?.videos?.[0]?.url ? (
        <div className="mikrotik-pdp__section">
          <div className="mikrotik-pdp__container">
            <a
              className="mikrotik-pdp__video"
              href={videoSection.videos[0].url}
              target="_blank"
              rel="noopener noreferrer"
              title="Watch video"
            >
              {videoSection.videos[0].poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={videoSection.videos[0].poster} alt="Video thumbnail" />
              ) : null}
              <span className="mikrotik-pdp__video-play" aria-hidden>
                ▶
              </span>
            </a>
          </div>
        </div>
      ) : null}

      {others.map((section, idx) => {
        const heading = section.heading || "";
        return (
          <div key={`${heading}-${idx}`} className="mikrotik-pdp__section">
            <div className="mikrotik-pdp__container">
              {heading ? <h2 className="mikrotik-pdp__heading-accent">{heading}</h2> : null}
              {section.text ? (
                <p
                  className={`mikrotik-pdp__center-copy${
                    /pair a |routeros license/i.test(section.text) ? " mikrotik-pdp__center-copy--muted" : ""
                  }`}
                >
                  {section.text}
                </p>
              ) : null}
              {(section.media || []).map((m) =>
                m.url ? (
                  <div key={m.url} className="mikrotik-pdp__media-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt || heading || product.productTitle} />
                  </div>
                ) : null,
              )}
            </div>
          </div>
        );
      })}

      {featureSection?.features?.length ? (
        <div className="mikrotik-pdp__section">
          <div className="mikrotik-pdp__container">
            <div className="mikrotik-pdp__feature-grid">
              {featureSection.features.map((f, i) => {
                const cardTitle = f.title || "";
                const body = f.body || (f as { description?: string }).description || "";
                if (!cardTitle && !body) return null;
                return (
                  <div key={`${cardTitle}-${i}`} className="mikrotik-pdp__feature-card">
                    {cardTitle ? <h3>{cardTitle}</h3> : null}
                    {body ? <p>{body}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MikroTikProductDetailTemplate({ viewModel }: Props) {
  const display = viewModel.pageCtx.display;
  const { product, purchasePrices, buyNowHref, productCtaEffective, labels, currencyCtx, collectionTrail } =
    viewModel;
  const title = viewModel.title || product.productTitle;
  const sku = product.mpn || product.manufacturer_part_number || product.id || "";
  const description = product.short_description || product.description || "";
  const images = useMemo(
    () => (product.media?.images || []).filter((img) => Boolean(img.url?.trim())),
    [product.media?.images],
  );

  const showGallery = display.gallery.enabled && images.length > 0;
  const showPrice = display.price.enabled;
  const showDescription = display.shortDescription.enabled && Boolean(description);
  const showBuyNow = display.buyNow.enabled;
  const showSticky = display.floatingCta.enabled;
  const showChrome = display.breadcrumb.enabled;
  const showSpecs =
    (display.tabs.enabled || display.tabSpecs.enabled) &&
    Boolean(
      (product.specifications?.length || 0) > 0 ||
        (product.included_parts?.length || 0) > 0 ||
        product.note ||
        (product.wireless_tables?.length || 0) > 0 ||
        product.ethernet_test?.html,
    );
  const showDocuments =
    display.tabDocuments.enabled &&
    Boolean((product.documents?.length || 0) > 0 || product.brochure?.url);
  const showOverview =
    display.tabs.enabled &&
    display.tabOverview.enabled &&
    Boolean((product.detailed_description?.length || 0) > 0);
  const showHighlights = showOverview || showGallery;

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  const heroImage = images[0]?.url;
  const highlights =
    product.highlights ||
    product.detailed_description?.find((s) => (s.heading || "").toLowerCase() === "highlights")
      ?.features ||
    [];

  const docs = product.documents || [];
  const brochure = product.brochure;
  const downloads = product.downloads;
  const included = product.included_parts || [];
  const wireless = product.wireless_tables || [];
  const ethernet = product.ethernet_test;
  const ctaLabel = productCtaEffective.label || labels.buyNow || "Add to cart";
  const showDownloads = display.tabDocuments.enabled && Boolean(downloads?.groups?.length);

  const safeGalleryIndex = images.length ? Math.min(galleryIndex, images.length - 1) : 0;
  const zoomSrc = images[safeGalleryIndex]?.url || "";
  const zoomAlt = images[safeGalleryIndex]?.alt || title;
  const zoomCounter =
    images.length > 1 ? `${safeGalleryIndex + 1} / ${images.length}` : undefined;

  useEffect(() => {
    if (galleryIndex >= images.length && images.length > 0) {
      setGalleryIndex(0);
    }
  }, [galleryIndex, images.length]);

  useEffect(() => {
    if (!showSticky) {
      setStickyVisible(false);
      return;
    }
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!(entry?.isIntersecting ?? true)),
      { threshold: 0.05 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [showSticky]);

  const openZoom = (index: number) => {
    if (!images.length) return;
    setGalleryIndex(index);
    setZoomOpen(true);
  };

  const stepGallery = (delta: number) => {
    if (images.length < 2) return;
    setGalleryIndex((i) => (i + delta + images.length) % images.length);
  };

  return (
    <div className="prd-page prd-page--mikrotik" data-prd-sticky-crumb="false">
      <ProductStickyLayoutInit />
      {showChrome ? (
        <div className="prd-page__chrome-rail">
          <nav className="prd-page__chrome prd-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">{labels.home}</Link>
            <span className="prd-breadcrumb__sep">&gt;&gt;</span>
            {collectionTrail.length > 0 ? (
              <>
                <Link href="/categories">{labels.collections}</Link>
                {collectionTrail.map((item) => (
                  <span key={item.href} className="prd-breadcrumb__trail">
                    <span className="prd-breadcrumb__sep">&gt;&gt;</span>
                    <Link href={stripAnyLocalePrefix(item.href)}>{item.name}</Link>
                  </span>
                ))}
              </>
            ) : (
              <Link href="/products">{labels.products}</Link>
            )}
            <span className="prd-breadcrumb__sep">&gt;&gt;</span>
            <span className="prd-breadcrumb__current">{title}</span>
          </nav>
        </div>
      ) : null}

    <section className="mikrotik-pdp">
      <header ref={heroRef} className="mikrotik-pdp__hero">
        <div className="mikrotik-pdp__container mikrotik-pdp__hero-grid">
          <div className="mikrotik-pdp__hero-copy">
            <h1>{title}</h1>
            {showDescription ? <p>{description}</p> : null}
            {showPrice ? (
              <div className="mikrotik-pdp__price">
                <ProductPriceDisplay
                  ctx={currencyCtx}
                  amount={purchasePrices.sale}
                  displayCode={purchasePrices.displayCode}
                  numberLocale={purchasePrices.numberLocale}
                />
              </div>
            ) : null}
            <div className="mikrotik-pdp__hero-actions">
              {showBuyNow ? (
                buyNowHref ? (
                  <Link href={buyNowHref} className="mikrotik-pdp__btn mikrotik-pdp__btn--primary">
                    {ctaLabel}
                  </Link>
                ) : (
                  <span className="mikrotik-pdp__btn mikrotik-pdp__btn--primary">{ctaLabel}</span>
                )
              ) : null}
              {showSpecs ? (
                <a href="#mtk-specification" className="mikrotik-pdp__btn">
                  Specification
                </a>
              ) : null}
            </div>
            {sku ? <div className="mikrotik-pdp__sku">{sku}</div> : null}
          </div>
          {showGallery && heroImage ? (
            <div className="mikrotik-pdp__hero-media">
              <button
                type="button"
                className="mikrotik-pdp__hero-media-btn"
                onClick={() => openZoom(0)}
                aria-label="Open photo gallery"
                title="Open photo gallery"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt={title} />
              </button>
            </div>
          ) : null}
        </div>
        {showHighlights && highlights.length ? (
          <div className="mikrotik-pdp__container">
            <div className="mikrotik-pdp__highlights">
              {highlights.map((h, i) => {
                const label =
                  (h as { label?: string }).label ||
                  (h as { title?: string }).title ||
                  "";
                if (!label) return null;
                return (
                  <div key={`${label}-${i}`} className="mikrotik-pdp__highlight">
                    <span className="mikrotik-pdp__highlight-dot" />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </header>

      <MarketingSections product={product} overviewEnabled={showOverview} />

      {showGallery && images.length > 0 ? (
        <div className="mikrotik-pdp__section">
          <div className="mikrotik-pdp__container">
            <div className="mikrotik-pdp__gallery">
              <div className="mikrotik-pdp__gallery-main">
                <button
                  type="button"
                  className="mikrotik-pdp__gallery-main-btn"
                  onClick={() => openZoom(safeGalleryIndex)}
                  aria-label="Zoom image"
                  title="Zoom image"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[safeGalleryIndex]?.url}
                    alt={images[safeGalleryIndex]?.alt || title}
                  />
                </button>
                {images.length > 1 ? (
                  <div className="mikrotik-pdp__gallery-nav">
                    <button type="button" aria-label="Previous" onClick={() => stepGallery(-1)}>
                      ‹
                    </button>
                    <button type="button" aria-label="Next" onClick={() => stepGallery(1)}>
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
              {images.length > 1 ? (
                <div className="mikrotik-pdp__thumbs">
                  {images.map((img, i) => (
                    <button
                      key={img.url || i}
                      type="button"
                      className={i === safeGalleryIndex ? "is-active" : undefined}
                      onClick={() => setGalleryIndex(i)}
                      onDoubleClick={() => openZoom(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt || `Thumbnail ${i + 1}`} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showSpecs ? (
        <div id="mtk-specification" className="mikrotik-pdp__section mikrotik-pdp__section--panel">
          <div className="mikrotik-pdp__container">
            <h2 className="mikrotik-pdp__specs-title">Specification</h2>
            {display.tabSpecs.enabled ? (
              <Accordion title="Specification" defaultOpen>
                <SpecGroups product={product} />
                {included.length ? (
                  <div className="mikrotik-pdp__spec-group">
                    <div className="mikrotik-pdp__spec-label">Included parts</div>
                    <div className="mikrotik-pdp__parts">
                      {included.map((part) => (
                        <div key={part.label || part.image} className="mikrotik-pdp__part">
                          {part.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={part.image} alt={part.label || "Included part"} />
                          ) : null}
                          <div>{part.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {product.note ? (
                  <div className="mikrotik-pdp__spec-group">
                    <div className="mikrotik-pdp__spec-label">Note</div>
                    <div className="mikrotik-pdp__note">{product.note}</div>
                  </div>
                ) : null}
              </Accordion>
            ) : null}

            {display.tabSpecs.enabled && wireless.length ? (
              <Accordion title="Wireless specification">
                {wireless.map((table) => (
                  <table key={table.band} className="mikrotik-pdp__wireless-table">
                    <thead>
                      <tr>
                        {(table.headers || []).map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(table.rows || []).map((row, ri) => (
                        <tr key={`${table.band}-${ri}`}>
                          {row.map((cell, ci) => (
                            <td key={`${ri}-${ci}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              </Accordion>
            ) : null}

            {display.tabSpecs.enabled && ethernet?.html ? (
              <Accordion title="Ethernet test results">
                <div
                  className="mikrotik-pdp__eth-html"
                  dangerouslySetInnerHTML={{ __html: ethernet.html }}
                />
                {ethernet.notes?.length ? (
                  <ol className="mikrotik-pdp__eth-notes">
                    {ethernet.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ol>
                ) : null}
              </Accordion>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDocuments ? (
        <div className="mikrotik-pdp__section mikrotik-pdp__section--muted">
          <div className="mikrotik-pdp__container">
            <h2 className="mikrotik-pdp__section-title">Documents</h2>
            <div className="mikrotik-pdp__docs-panel">
              {brochure?.url ? (
                <a
                  className="mikrotik-pdp__brochure"
                  href={brochure.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h4>Brochure</h4>
                  <p>Read product brochure and find out about features and specification</p>
                  <span className="mikrotik-pdp__brochure-badge">.PDF</span>
                  {brochure.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brochure.thumbnail} alt="Brochure" />
                  ) : null}
                </a>
              ) : null}
              <ul className="mikrotik-pdp__doc-list">
                {docs
                  .filter((d) => d.url && (!brochure?.url || d.url !== brochure.url))
                  .map((doc) => (
                    <li key={doc.url}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <span className="mikrotik-pdp__doc-icon" aria-hidden>
                          ▤
                        </span>
                        <span>{doc.title || "Document"}</span>
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {showDownloads ? (
        <div className="mikrotik-pdp__section mikrotik-pdp__section--muted">
          <div className="mikrotik-pdp__container">
            <h2 className="mikrotik-pdp__section-title">Download</h2>
            {downloads?.banner ? (
              <div className="mikrotik-pdp__download-banner">{downloads.banner}</div>
            ) : null}
            <div className="mikrotik-pdp__download-grid">
              {(downloads?.groups || []).map((group) => (
                <div key={group.name} className="mikrotik-pdp__download-col">
                  <h4>{group.name}</h4>
                  {(group.items || []).map((item) =>
                    item.url ? (
                      <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showSticky ? (
        <div
          className={`mikrotik-pdp__sticky${stickyVisible ? " is-visible" : ""}`}
          aria-hidden={!stickyVisible}
        >
          <div className="mikrotik-pdp__sticky-inner">
            <div>
              <div className="mikrotik-pdp__sticky-title">{title}</div>
              {sku ? <div className="mikrotik-pdp__sku">{sku}</div> : null}
            </div>
            <div className="mikrotik-pdp__sticky-actions">
              {showPrice ? (
                <ProductPriceDisplay
                  ctx={currencyCtx}
                  amount={purchasePrices.sale}
                  displayCode={purchasePrices.displayCode}
                  numberLocale={purchasePrices.numberLocale}
                />
              ) : null}
              {showBuyNow ? (
                buyNowHref ? (
                  <Link href={buyNowHref} className="mikrotik-pdp__btn mikrotik-pdp__btn--primary">
                    {ctaLabel}
                  </Link>
                ) : (
                  <span className="mikrotik-pdp__btn mikrotik-pdp__btn--primary">{ctaLabel}</span>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showGallery ? (
        <UniFiGalleryZoom
          open={zoomOpen}
          src={zoomSrc}
          alt={zoomAlt}
          counter={zoomCounter}
          onClose={() => setZoomOpen(false)}
          onPrev={images.length > 1 ? () => stepGallery(-1) : undefined}
          onNext={images.length > 1 ? () => stepGallery(1) : undefined}
        />
      ) : null}
    </section>
    </div>
  );
}
