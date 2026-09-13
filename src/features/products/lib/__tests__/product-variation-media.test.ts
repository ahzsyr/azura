import assert from "node:assert/strict";
import test from "node:test";
import type { Product } from "@/features/products/types";
import {
  filterBySelectedColor,
  filterBySelectedVariations,
  findMatchingCombination,
  imagesForSelectedColor,
  imagesForSelectedVariations,
  mediaForSelectedColor,
  sectionsMediaForColor,
  sectionsVideosForColor,
  videosForSelectedColor,
} from "../product-variation-media";

function product(): Product {
  return {
    id: "u7",
    productTitle: "U7 Pro XG",
    price: { value: 731, currency: "AED" },
    media: {
      images: [
        { url: "https://example.com/thumb-white.png", alt: "U7 Pro XG", type: "main" },
        { url: "https://example.com/black-1.png", alt: "Black", type: "gallery", color: "Black" },
        { url: "https://example.com/white-1.png", alt: "White", type: "gallery", color: "White" },
      ],
      videos: [
        { url: "https://example.com/black.mp4", type: "upload", color: "Black" },
        { url: "https://example.com/white.mp4", type: "upload", color: "White" },
      ],
    },
    detailed_description: [
      {
        heading: "Technical Highlights",
        text: "",
        tab: "technical",
        media: [
          { url: "https://example.com/tech-black.png", alt: "Black diagram", color: "Black" },
          { url: "https://example.com/tech-white.png", alt: "White diagram", color: "White" },
        ],
      },
      {
        heading: "Installation Tutorial",
        text: "",
        tab: "installation",
        videos: [
          { url: "https://example.com/install-black.mp4", type: "upload", color: "Black" },
          { url: "https://example.com/install-white.mp4", type: "upload", color: "White" },
        ],
      },
      {
        heading: "In The Box",
        text: "",
        tab: "in_the_box",
        media: [
          { url: "https://example.com/box-black.png", color: "Black" },
          { url: "https://example.com/box-white.png", color: "White" },
          { url: "https://example.com/box-shared.png" },
        ],
      },
    ],
    reviews: { rating: 0, count: 0 },
    variations: [{ type: "Color", options: ["Black", "White"], default: "Black" }],
    variation_combinations: [
      {
        sku: "brt-U7-Pro-XG-B",
        Color: "Black",
        images: [
          { url: "https://example.com/combo-black.png", type: "main", color: "Black" },
          { url: "https://example.com/combo-black-2.png", type: "gallery", color: "Black" },
        ],
        videos: [{ url: "https://example.com/combo-black.mp4", type: "upload", color: "Black" }],
      },
      {
        sku: "brt-U7-Pro-XG",
        Color: "White",
        images: [{ url: "https://example.com/combo-white.png", type: "main", color: "White" }],
      },
    ],
  };
}

test("selected color uses variation combination images", () => {
  const images = imagesForSelectedColor(product(), "Black");
  assert.equal(images[0]?.url, "https://example.com/combo-black.png");
  assert.ok(images.every((img) => img.color === "Black"));
});

test("white selection does not keep the untagged white thumbnail", () => {
  const images = imagesForSelectedColor(product(), "White");
  assert.equal(images[0]?.url, "https://example.com/combo-white.png");
  assert.equal(images.some((img) => img.url?.includes("thumb-white")), false);
});

test("falls back to color-tagged gallery images when combinations have none", () => {
  const slim = product();
  slim.variation_combinations = [{ sku: "x", Color: "Black" }];
  const images = imagesForSelectedColor(slim, "Black");
  assert.deepEqual(
    images.map((img) => img.url),
    ["https://example.com/black-1.png"],
  );
});

test("strict filter keeps only matching tagged items and drops untagged when tags exist", () => {
  const items = [
    { url: "black.png", color: "Black" },
    { url: "white.png", color: "White" },
    { url: "shared.png" },
  ];
  assert.deepEqual(
    filterBySelectedColor(items, "Black").map((item) => item.url),
    ["black.png"],
  );
});

test("strict filter keeps untagged items only when nothing is tagged", () => {
  const items = [{ url: "a.png" }, { url: "b.png" }];
  assert.equal(filterBySelectedColor(items, "Black").length, 2);
});

test("prefer primary installation video drops poster-less alternate encodings", () => {
  const items = [
    {
      url: "https://example.com/install.mp4",
      type: "upload" as const,
      poster: "https://example.com/poster.png",
    },
    { url: "https://example.com/install-alt.mp4", type: "upload" as const },
  ];
  assert.deepEqual(
    filterBySelectedVariations(items, { Color: "Black" }).map((item) => item.url),
    ["https://example.com/install.mp4"],
  );
});

test("videosForSelectedColor prefers combination videos then tagged media", () => {
  assert.equal(videosForSelectedColor(product(), "Black")[0]?.url, "https://example.com/combo-black.mp4");
  assert.equal(videosForSelectedColor(product(), "White")[0]?.url, "https://example.com/white.mp4");
});

test("mediaForSelectedColor matches imagesForSelectedColor", () => {
  assert.deepEqual(mediaForSelectedColor(product(), "Black"), imagesForSelectedColor(product(), "Black"));
});

test("technical, installation, and in-the-box media follow selected color", () => {
  const p = product();
  assert.deepEqual(
    sectionsMediaForColor(p, "technical", "Black").map((item) => item.url),
    ["https://example.com/tech-black.png"],
  );
  assert.deepEqual(
    sectionsVideosForColor(p, "installation", "White").map((item) => item.url),
    ["https://example.com/install-white.mp4"],
  );
  assert.deepEqual(
    sectionsMediaForColor(p, "in_the_box", "White").map((item) => item.url),
    ["https://example.com/box-white.png"],
  );
});

test("infers color tags from variation combination URLs for untagged section media", () => {
  const p = product();
  p.detailed_description = [
    {
      heading: "Technical Highlights",
      text: "",
      tab: "technical",
      media: [
        { url: "https://example.com/combo-black.png", alt: "untagged black" },
        { url: "https://example.com/combo-white.png", alt: "untagged white" },
      ],
    },
  ];
  assert.deepEqual(
    sectionsMediaForColor(p, "technical", "Black").map((item) => item.url),
    ["https://example.com/combo-black.png"],
  );
});

test("multiple variation dimensions pick the matching combination", () => {
  const p = product();
  p.variations = [
    { type: "Color", options: ["Black", "White"], default: "Black" },
    { type: "Plug", options: ["EU", "UK"], default: "EU" },
  ];
  p.variation_combinations = [
    {
      sku: "black-eu",
      Color: "Black",
      Plug: "EU",
      images: [{ url: "https://example.com/black-eu.png", type: "main", attributes: { Color: "Black", Plug: "EU" } }],
    },
    {
      sku: "black-uk",
      Color: "Black",
      Plug: "UK",
      images: [{ url: "https://example.com/black-uk.png", type: "main", attributes: { Color: "Black", Plug: "UK" } }],
    },
    {
      sku: "white-eu",
      Color: "White",
      Plug: "EU",
      images: [{ url: "https://example.com/white-eu.png", type: "main", attributes: { Color: "White", Plug: "EU" } }],
    },
  ];
  const images = imagesForSelectedVariations(p, { Color: "Black", Plug: "UK" });
  assert.equal(images[0]?.url, "https://example.com/black-uk.png");
  assert.equal(findMatchingCombination(p, { Color: "White", Plug: "EU" })?.sku, "white-eu");
});

test("strict filter matches every tagged dimension on an item", () => {
  const items = [
    { url: "black-eu.png", attributes: { Color: "Black", Plug: "EU" } },
    { url: "black-uk.png", attributes: { Color: "Black", Plug: "UK" } },
    { url: "black-any.png", color: "Black" },
  ];
  assert.deepEqual(
    filterBySelectedVariations(items, { Color: "Black", Plug: "EU" }).map((item) => item.url),
    ["black-eu.png", "black-any.png"],
  );
});
