import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { manifestIconsForUrl, resolveFaviconUrl } from "@/lib/metadata/favicon-url";

describe("resolveFaviconUrl", () => {
  it("normalizes local upload paths", () => {
    assert.equal(
      resolveFaviconUrl("uploads/svg/1782896153077-BRT_Logo_svg.svg"),
      "/uploads/svg/1782896153077-BRT_Logo_svg.svg",
    );
  });
});

describe("manifestIconsForUrl", () => {
  it("does not advertise SVG as PNG", () => {
    const icons = manifestIconsForUrl("/uploads/svg/1782896153077-BRT_Logo_svg.svg");
    assert.deepEqual(icons, [
      {
        src: "/uploads/svg/1782896153077-BRT_Logo_svg.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ]);
  });

  it("keeps PNG slots for raster logos", () => {
    const icons = manifestIconsForUrl("/uploads/images/logo.png");
    assert.equal(icons.length, 2);
    assert.ok(icons.every((icon) => icon.type === "image/png"));
  });
});
