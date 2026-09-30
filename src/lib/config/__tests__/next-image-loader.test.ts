import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nextImageLoader from "../next-image-loader";

describe("nextImageLoader", () => {
  it("returns direct path for local uploads", () => {
    assert.equal(
      nextImageLoader({
        src: "/uploads/images/1783422285628-Gemini_Generated_Image_bxgqitbxgqitbxgq.png",
        width: 640,
        quality: 75,
      }),
      "/uploads/images/1783422285628-Gemini_Generated_Image_bxgqitbxgqitbxgq.png",
    );
  });

  it("returns direct path for same-origin absolute upload URLs", () => {
    assert.equal(
      nextImageLoader({
        src: "https://brt-me.com/uploads/images/hero.webp",
        width: 640,
      }),
      "/uploads/images/hero.webp",
    );
  });

  it("routes allowed remote hosts through the optimizer", () => {
    const url = nextImageLoader({
      src: "https://images.unsplash.com/photo-123",
      width: 640,
      quality: 75,
    });
    assert.match(url, /^\/_next\/image\?/);
    assert.match(url, /url=https%3A%2F%2Fimages\.unsplash\.com%2Fphoto-123/);
    assert.match(url, /w=640/);
    assert.match(url, /q=75/);
  });

  it("returns direct path for getic catalog hosts", () => {
    assert.equal(
      nextImageLoader({
        src: "https://www.getic.com/images/catalogue/1861/product.jpg",
        width: 640,
      }),
      "https://www.getic.com/images/catalogue/1861/product.jpg",
    );
  });
});
