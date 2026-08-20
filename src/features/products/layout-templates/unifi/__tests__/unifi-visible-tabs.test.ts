import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductPageDisplay } from "@/features/products/lib/product-page-display";
import { listVisibleUniFiTabs, visibleUniFiTabs } from "@/features/products/layout-templates/unifi/unifi-visible-tabs";
import type { Product } from "@/features/products/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "u7",
    productTitle: "U7 Pro XG",
    price: { value: 731, currency: "AED" },
    media: { images: [{ url: "https://example.com/main.png", type: "main" }] },
    reviews: { rating: 0, count: 0 },
    detailed_description: [
      { heading: "Key Features", text: "Hero", tab: "overview", media: [{ url: "https://example.com/o.png" }] },
      { heading: "Overview", text: "", tab: "overview", media: [{ url: "https://example.com/o2.png" }] },
      { heading: "Technical Highlights", text: "", tab: "technical", media: [{ url: "https://example.com/t.png" }] },
      { heading: "In The Box", text: "", tab: "in_the_box", media: [{ url: "https://example.com/box.png" }] },
      {
        heading: "Installation Tutorial",
        text: "",
        tab: "installation",
        videos: [{ url: "https://example.com/i.mp4" }],
      },
      { heading: "3D Model", text: "", tab: "3d", model_3d: { enabled: true, url: "https://example.com/m.glb" } },
    ],
    specifications: [{ technology: "Overview", items: [{ name: "WiFi Standard", value: "WiFi 7" }] }],
    bought_together: [{ name: "Adapter", url: "/product/adapter", price: 143 }],
    ...overrides,
  };
}

test("UniFi tabs follow display flags and content, not frequentlyBought", () => {
  const display = resolveProductPageDisplay({ frequentlyBought: { enabled: false } });
  const tabs = visibleUniFiTabs(display, product());
  assert.deepEqual(tabs, ["overview", "technical", "in-the-box", "installation"]);
});

test("tab labels come from product headings when they are unique", () => {
  const display = resolveProductPageDisplay();
  const tabs = listVisibleUniFiTabs(display, product());
  assert.deepEqual(
    tabs.map((tab) => tab.label),
    ["Overview", "Technical Highlights", "In The Box", "Installation Tutorial"],
  );
});

test("tab count follows converter sections and skips 3D gallery tab", () => {
  const display = resolveProductPageDisplay();
  const slim = product({
    specifications: [],
    detailed_description: [
      { heading: "Overview", text: "Hero", tab: "overview", media: [{ url: "https://example.com/o.png" }] },
      { heading: "In The Box", text: "", tab: "in_the_box", media: [{ url: "https://example.com/box.png" }] },
      { heading: "3D Model", text: "", tab: "3d" },
    ],
  });
  assert.deepEqual(
    listVisibleUniFiTabs(display, slim).map((tab) => tab.label),
    ["Overview", "In The Box"],
  );
});

test("unknown converter tabs appear with their heading as the label", () => {
  const display = resolveProductPageDisplay();
  const extra = product({
    specifications: [],
    detailed_description: [
      { heading: "Overview", text: "Hero", tab: "overview", media: [{ url: "https://example.com/o.png" }] },
      { heading: "Works with UniFi", text: "", tab: "compatibility", media: [{ url: "https://example.com/c.png" }] },
    ],
  });
  const tabs = listVisibleUniFiTabs(display, extra);
  assert.deepEqual(
    tabs.map((tab) => ({ id: tab.id, label: tab.label })),
    [
      { id: "overview", label: "Overview" },
      { id: "compatibility", label: "Works with UniFi" },
    ],
  );
});

test("disabling tabInBox hides In The Box even when accessories exist", () => {
  const display = resolveProductPageDisplay(undefined, { tabInBox: { enabled: false, inherit: false } });
  const tabs = visibleUniFiTabs(display, product());
  assert.equal(tabs.includes("in-the-box"), false);
  assert.ok(tabs.includes("overview"));
});

test("disabling tabs hides the entire UniFi tab region", () => {
  const display = resolveProductPageDisplay({ tabs: { enabled: false } });
  assert.deepEqual(visibleUniFiTabs(display, product()), []);
});

test("tabOverview alias follows tabDescription when UniFi key is unset", () => {
  const display = resolveProductPageDisplay({ tabDescription: { enabled: false } });
  assert.equal(display.tabOverview.enabled, false);
  assert.equal(visibleUniFiTabs(display, product()).includes("overview"), false);
});

test("documents alone do not invent an Installation tab", () => {
  const display = resolveProductPageDisplay();
  const tabs = visibleUniFiTabs(
    display,
    product({
      detailed_description: [
        { heading: "Overview", text: "Hero", tab: "overview", media: [{ url: "https://example.com/o.png" }] },
      ],
      specifications: [],
      documents: [{ title: "Guide", url: "https://example.com/guide.pdf" }],
    }),
  );
  assert.deepEqual(tabs, ["overview"]);
});

test("interactiveFeatures alias disables UniFi model viewer", () => {
  const display = resolveProductPageDisplay({
    interactiveFeatures: { enabled: false },
  } as Parameters<typeof resolveProductPageDisplay>[0]);
  assert.equal(display.modelViewer.enabled, false);
});
