import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveBrowserTint, type BrowserTintInput } from "@/lib/theme/browser-tint/resolve";
import type { ChromeTintStyle, IosStatusBarStyle } from "@/schemas/theme";

const CANVAS = { light: "#f8f5ef", dark: "#0a0f18" };
const BASES = {
  surface: { light: CANVAS.light, dark: CANVAS.dark },
  primary: { light: "#d8c180", dark: "#7c6938" },
} as const;

const BASE: Omit<BrowserTintInput, "appearance" | "style" | "edgeToEdge" | "iosStatusBarStyle"> = {
  colorLight: BASES.surface.light,
  colorDark: BASES.surface.dark,
  canvasLight: CANVAS.light,
  canvasDark: CANVAS.dark,
  gradientLight: "linear-gradient(to bottom, #d8c180 0%, transparent 100%)",
  gradientDark: "linear-gradient(to bottom, #7c6938 0%, transparent 100%)",
};

function plan(
  style: ChromeTintStyle,
  appearance: "light" | "dark",
  extra?: Partial<BrowserTintInput>,
) {
  return resolveBrowserTint({
    ...BASE,
    appearance,
    style,
    edgeToEdge: true,
    iosStatusBarStyle: "black-translucent",
    ...extra,
  });
}

describe("resolveBrowserTint", () => {
  for (const basisName of ["surface", "primary"] as const) {
    const basis = BASES[basisName];
    for (const appearance of ["light", "dark"] as const) {
      const color = appearance === "dark" ? basis.dark : basis.light;
      const colors = {
        colorLight: basis.light,
        colorDark: basis.dark,
        gradientLight: null,
        gradientDark: null,
      };

      for (const style of ["transparent", "glass"] as const) {
        it(`${style} / ${basisName} / ${appearance} samples the page on both edges`, () => {
          const attrs = plan(style, appearance, colors);
          assert.equal(attrs.top, "page");
          assert.equal(attrs.bottom, "page");
          assert.equal(attrs.htmlBackground, "transparent");
          assert.equal(attrs.pad, "off");
          assert.equal(attrs.topColor, color);
          assert.equal(attrs.bottomColor, color);
        });
      }

      it(`solid / ${basisName} / ${appearance} paints the basis on both edges`, () => {
        const attrs = plan("solid", appearance, colors);
        assert.equal(attrs.top, "color");
        assert.equal(attrs.bottom, "color");
        assert.equal(attrs.topColor, color);
        assert.equal(attrs.bottomColor, color);
        assert.equal(attrs.htmlBackground, color);
      });

      it(`gradient / ${basisName} / ${appearance} fades the basis into the page`, () => {
        const attrs = plan("gradient", appearance, colors);
        assert.equal(attrs.top, "gradient");
        assert.equal(attrs.bottom, "gradient");
        assert.equal(attrs.htmlBackground, "transparent");
        assert.match(attrs.gradient, new RegExp(`linear-gradient\\(to bottom, ${color}`));
        assert.equal(attrs.bottomColor, color);
      });
    }
  }

  it("edge-to-edge off pads and paints the canvas on the top edge", () => {
    const glass = plan("glass", "light", { edgeToEdge: false });
    assert.equal(glass.pad, "on");
    assert.equal(glass.top, "color");
    assert.equal(glass.topColor, CANVAS.light);
    assert.equal(glass.htmlBackground, CANVAS.light);
    assert.equal(glass.bottom, "page");

    const solid = plan("solid", "dark", {
      edgeToEdge: false,
      colorLight: BASES.primary.light,
      colorDark: BASES.primary.dark,
    });
    assert.equal(solid.pad, "on");
    assert.equal(solid.top, "color");
    assert.equal(solid.topColor, CANVAS.dark);
    assert.equal(solid.htmlBackground, CANVAS.dark);
    assert.equal(solid.bottom, "color");
    assert.equal(solid.bottomColor, BASES.primary.dark);
  });

  for (const ios of ["black", "default", "black-translucent"] as const satisfies readonly IosStatusBarStyle[]) {
    it(`status bar ${ios} overrides only the top band`, () => {
      const attrs = plan("glass", "light", { iosStatusBarStyle: ios });
      if (ios === "black") {
        assert.equal(attrs.top, "color");
        assert.equal(attrs.topColor, "#000000");
      } else if (ios === "default") {
        assert.equal(attrs.top, "color");
        assert.equal(attrs.topColor, "#f7f7f8");
      } else {
        assert.equal(attrs.top, "page");
      }
      assert.equal(attrs.bottom, "page");
      assert.equal(attrs.htmlBackground, "transparent");
    });
  }
});
