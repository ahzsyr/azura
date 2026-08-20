"use client";

import type { ProductDetailViewModel } from "@/view-models/product-detail";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { ProductStickyLayoutInit } from "@/features/products/components/pdp/product-sticky-layout-init";
import {
  findMatchingCombination,
  imagesForSelectedVariations,
  type VariationSelection,
} from "@/features/products/lib/product-variation-media";
import {
  buildVariationDimensions,
  initialSelectedFromDimensions,
} from "@/features/products/lib/product-variation-pricing";
import { UniFiStickyPurchaseBar } from "./unifi-sticky-purchase-bar";
import { UniFiTabNav } from "./unifi-tab-nav";
import { UniFiGallery } from "./unifi-gallery";
import { UniFiBuyColumn } from "./unifi-buy-column";
import { UniFiOverviewPanel } from "./unifi-overview-panel";
import { UniFiTechnicalAccordion } from "./unifi-technical-accordion";
import { UniFiInstallationPanel } from "./unifi-installation-panel";
import { UniFiInTheBoxPanel } from "./unifi-in-the-box-panel";
import { listVisibleUniFiTabs } from "./unifi-display";
import { hasTechnicalContent, type UniFiTabDef } from "@/features/products/lib/unifi-product-sections";
import { useUniFiStickyLayout } from "./use-unifi-sticky-layout";
import "./unifi-pdp.css";

type Props = {
  viewModel: ProductDetailViewModel;
};

function UniFiTabPanel({
  tab,
  viewModel,
  selectedVariations,
}: {
  tab: UniFiTabDef;
  viewModel: ProductDetailViewModel;
  selectedVariations?: VariationSelection;
}) {
  const display = viewModel.pageCtx.display;
  switch (tab.kind) {
    case "overview":
      return <UniFiOverviewPanel viewModel={viewModel} tab={tab.key} selectedVariations={selectedVariations} />;
    case "technical":
      return (
        <>
          <UniFiOverviewPanel viewModel={viewModel} tab={tab.key} selectedVariations={selectedVariations} />
          {hasTechnicalContent(viewModel.product) ? (
            <UniFiTechnicalAccordion
              product={viewModel.product}
              labels={viewModel.labels}
              display={display}
            />
          ) : null}
        </>
      );
    case "installation":
      return (
        <UniFiInstallationPanel
          product={viewModel.product}
          labels={viewModel.labels}
          showDocuments={display.tabDocuments.enabled}
          tab={tab.key}
          selectedVariations={selectedVariations}
        />
      );
    case "in_the_box":
      return <UniFiInTheBoxPanel viewModel={viewModel} tab={tab.key} selectedVariations={selectedVariations} />;
    default:
      return <UniFiOverviewPanel viewModel={viewModel} tab={tab.key} selectedVariations={selectedVariations} />;
  }
}

export function UniFiProductDetailTemplate({ viewModel }: Props) {
  const display = viewModel.pageCtx.display;
  const visibleTabs = useMemo(
    () => listVisibleUniFiTabs(display, viewModel.product),
    [display, viewModel.product],
  );
  const dimensions = useMemo(
    () => buildVariationDimensions(viewModel.product),
    [viewModel.product],
  );
  const [selectedVariations, setSelectedVariations] = useState<VariationSelection>(() =>
    initialSelectedFromDimensions(dimensions),
  );
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id ?? "");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const pdpRef = useRef<HTMLDivElement>(null);
  const showGallery = display.gallery.enabled;
  const showBuy = display.sideBuyBox.enabled;
  const showSticky = display.floatingCta.enabled;
  const showTabs = visibleTabs.length > 0;
  const showChrome = display.breadcrumb.enabled;

  useUniFiStickyLayout(pdpRef, showStickyBar);

  useEffect(() => {
    const node = heroRef.current;
    if (!node || !showSticky) return;

    const readOffset = () =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--unifi-header-offset").trim()) ||
      (() => {
        const header =
          document.getElementById("headerRoot") ?? document.querySelector<HTMLElement>(".header-root");
        return header ? Math.ceil(header.getBoundingClientRect().bottom) : 88;
      })();

    const update = () => {
      const headerOffset = readOffset();
      const rect = node.getBoundingClientRect();
      setShowStickyBar(rect.bottom <= headerOffset + 8);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    const observer = new IntersectionObserver(update, { threshold: [0, 0.01, 1] });
    observer.observe(node);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [showSticky]);

  const selectedCombo = useMemo(
    () => findMatchingCombination(viewModel.product, selectedVariations),
    [viewModel.product, selectedVariations],
  );

  const sku = useMemo(() => {
    const comboSku = typeof selectedCombo?.sku === "string" ? selectedCombo.sku : "";
    return (
      comboSku ||
      viewModel.product.mpn ||
      viewModel.product.manufacturer_part_number ||
      viewModel.productId
    );
  }, [selectedCombo, viewModel.product, viewModel.productId]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("product:variation-change", {
        detail: { selected: selectedVariations, sku },
      }),
    );
  }, [selectedVariations, sku]);

  useEffect(() => {
    setActiveTab((current) => {
      const hash = window.location.hash.replace("#", "");
      if (visibleTabs.some((tab) => tab.id === hash)) return hash;
      if (visibleTabs.some((tab) => tab.id === current)) return current;
      return visibleTabs[0]?.id ?? current;
    });
  }, [visibleTabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#${tabId}`);
    document.getElementById(`unifi-tab-${tabId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const gridClass = [
    "unifi-pdp__grid",
    !showGallery ? "unifi-pdp__grid--no-gallery" : "",
    !showBuy ? "unifi-pdp__grid--no-buy" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const colorImages = useMemo(
    () => imagesForSelectedVariations(viewModel.product, selectedVariations),
    [viewModel.product, selectedVariations],
  );

  const stickyThumb =
    colorImages.find((img) => img.type === "main")?.url || colorImages[0]?.url;

  const { labels, collectionTrail, title } = viewModel;

  return (
    <div className="prd-page prd-page--unifi" data-prd-sticky-crumb="false">
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

      <div className="unifi-pdp" ref={pdpRef} data-unifi-template="true" data-sticky-bar-visible={showStickyBar ? "true" : "false"}>
        <div className="unifi-pdp__hero" ref={heroRef}>
          {showGallery || showBuy ? (
            <div className={gridClass}>
              {showGallery ? (
                <div className="unifi-pdp__gallery-col">
                  <UniFiGallery
                    product={viewModel.product}
                    title={viewModel.title}
                    display={display}
                    selectedVariations={selectedVariations}
                  />
                </div>
              ) : null}
              {showBuy ? (
                <div className="unifi-pdp__buy-col">
                  <UniFiBuyColumn
                    viewModel={viewModel}
                    sku={sku}
                    display={display}
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    selectedVariations={selectedVariations}
                    onVariationChange={(type, value) =>
                      setSelectedVariations((current) => ({ ...current, [type]: value }))
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {showSticky || showTabs ? (
          <div
            className={`unifi-sticky-stack${showSticky && showStickyBar ? " unifi-sticky-stack--purchase-visible" : ""}`}
          >
            {showSticky ? (
              <UniFiStickyPurchaseBar
                visible={showStickyBar}
                title={viewModel.title}
                sku={sku}
                thumbnail={stickyThumb}
                prices={viewModel.purchasePrices}
                currencyCtx={viewModel.currencyCtx}
                labels={viewModel.labels}
                buyNowHref={viewModel.buyNowHref}
                productCta={viewModel.productCtaEffective}
                display={display}
              />
            ) : null}
            {showTabs ? (
              <UniFiTabNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                tabs={visibleTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
              />
            ) : null}
          </div>
        ) : null}

        {showTabs ? (
          <div className="unifi-pdp__tab-panels">
            {visibleTabs.map((tab) => (
              <section
                key={tab.id}
                id={`unifi-tab-${tab.id}`}
                className="unifi-pdp__tab-panel"
                hidden={activeTab !== tab.id}
              >
                <UniFiTabPanel tab={tab} viewModel={viewModel} selectedVariations={selectedVariations} />
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
