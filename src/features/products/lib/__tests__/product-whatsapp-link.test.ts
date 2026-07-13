import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWhatsAppProductUrl,
  DEFAULT_WHATSAPP_MESSAGE_TEMPLATE,
  interpolateProductMessage,
  parseWhatsAppExternalUrl,
  productLinkContextFromProduct,
} from "@/features/products/lib/product-whatsapp-link";
import { buildBuyNowHref, DEFAULT_RESOLVED_PRODUCT_BUY_NOW } from "@/features/products/lib/product-buy-now";
import { buildProductCtaHref, DEFAULT_RESOLVED_PRODUCT_CTA } from "@/features/products/lib/product-cta";

describe("product-whatsapp-link", () => {
  it("interpolates product title into message template", () => {
    const msg = interpolateProductMessage(DEFAULT_WHATSAPP_MESSAGE_TEMPLATE, {
      productTitle: "BF-TR8500",
      productSlug: "bf-tr8500",
    });
    assert.ok(msg.includes("BF-TR8500"));
  });

  it("builds wa.me URL with encoded message", () => {
    const url = buildWhatsAppProductUrl("971554727292", "Hi {productTitle}", {
      productTitle: "BF-TR8500",
    });
    assert.equal(url, "https://wa.me/971554727292?text=Hi%20BF-TR8500");
  });

  it("parses external wa.me URLs", () => {
    const parsed = parseWhatsAppExternalUrl(
      "https://wa.me/971554727292?text=Hi%2C%20I%20would%20like%20to%20get%20in%20touch",
    );
    assert.ok(parsed);
    assert.equal(parsed?.phone, "971554727292");
    assert.ok(parsed?.message.includes("Hi"));
  });

  it("returns null when phone is empty", () => {
    assert.equal(
      buildWhatsAppProductUrl("", DEFAULT_WHATSAPP_MESSAGE_TEMPLATE, { productTitle: "X" }),
      null,
    );
  });
});

describe("buildProductCtaHref whatsapp", () => {
  const locale = { code: "en", urlPrefix: "en", label: "English" };

  it("builds whatsapp link for dedicated link type", () => {
    const href = buildProductCtaHref(
      {
        ...DEFAULT_RESOLVED_PRODUCT_CTA,
        enabled: true,
        linkType: "whatsapp",
        whatsappPhone: "971554727292",
        whatsappMessage: "Hi {productTitle}",
      },
      locale,
      { productTitle: "BF-TR8500" },
    );
    assert.equal(href, "https://wa.me/971554727292?text=Hi%20BF-TR8500");
  });

  it("enhances external wa.me URLs with product title", () => {
    const href = buildProductCtaHref(
      {
        ...DEFAULT_RESOLVED_PRODUCT_CTA,
        enabled: true,
        linkType: "external",
        externalUrl: "https://wa.me/971554727292?text=Hi",
      },
      locale,
      { productTitle: "BF-TR8500" },
    );
    assert.ok(href?.includes("971554727292"));
    assert.ok(href?.includes("BF-TR8500"));
  });
});

describe("buildBuyNowHref whatsapp", () => {
  it("builds whatsapp buy now link with product title", () => {
    const href = buildBuyNowHref(
      {
        ...DEFAULT_RESOLVED_PRODUCT_BUY_NOW,
        destinationType: "whatsapp",
        whatsappPhone: "971554727292",
        whatsappMessage: "Hi {productTitle}",
      },
      "sample-slug",
      null,
      { productTitle: "BF-TR8500", productSlug: "sample-slug" },
    );
    assert.equal(href, "https://wa.me/971554727292?text=Hi%20BF-TR8500");
  });
});

describe("productLinkContextFromProduct", () => {
  it("resolves title from product fields", () => {
    const ctx = productLinkContextFromProduct({
      productTitle: "A",
      name: "B",
      title: "C",
      slug: "slug",
      mpn: "SKU-1",
    });
    assert.equal(ctx.productTitle, "A");
    assert.equal(ctx.productSlug, "slug");
    assert.equal(ctx.productSku, "SKU-1");
  });
});
