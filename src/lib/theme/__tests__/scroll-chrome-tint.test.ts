import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  activeColorFromChromeTintPair,
  chromeTintDataAttrs,
  CHROME_TINT_DARK_ATTR,
  CHROME_TINT_LIGHT_ATTR,
  mergeScrollChromeTint,
  pickDocumentExtremeTarget,
  pickDominantScrollChromeTarget,
  readScrollChromeTintFromElement,
  resetActiveScrollChromeTint,
  resolveDominantScrollChromeTarget,
  resolveScrollAwareChromeColors,
  scrollChromeTintEquals,
  setActiveScrollChromeTint,
  getActiveScrollChromeTint,
} from "@/lib/theme/scroll-chrome-tint";

function fakeEl(id: string, order: number): Element {
  const FOLLOWING = 4;
  const PRECEDING = 2;
  return {
    id,
    compareDocumentPosition(other: Element) {
      const otherOrder = (other as unknown as { __order: number }).__order;
      if (order === otherOrder) return 0;
      // other follows this when otherOrder > order
      return order < otherOrder ? FOLLOWING : PRECEDING;
    },
    __order: order,
  } as unknown as Element;
}

describe("scroll-chrome-tint", () => {
  beforeEach(() => {
    resetActiveScrollChromeTint();
  });

  it("chromeTintDataAttrs emits both light and dark data attributes", () => {
    const attrs = chromeTintDataAttrs("#e8f0ee", "#0a0a12");
    assert.equal(attrs[CHROME_TINT_LIGHT_ATTR], "#e8f0ee");
    assert.equal(attrs[CHROME_TINT_DARK_ATTR], "#0a0a12");
  });

  it("mergeScrollChromeTint falls back per-side when section omits a mode", () => {
    const merged = mergeScrollChromeTint(
      { lightColor: "#fafafa", darkColor: "#020408" },
      { light: "#e8f0ee", sourceKey: "hero" },
    );
    assert.equal(merged.lightColor, "#e8f0ee");
    assert.equal(merged.darkColor, "#020408");
  });

  it("resolveScrollAwareChromeColors prefers section tint when scroll is active", () => {
    const withScroll = resolveScrollAwareChromeColors({
      resolved: "dark",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#111111",
      scroll: { light: "#e8f0ee", dark: "#161622", sourceKey: "footer" },
    });
    assert.equal(withScroll.color, "#161622");
    assert.equal(withScroll.lightColor, "#e8f0ee");
    assert.equal(withScroll.darkColor, "#161622");
  });

  it("light appearance rejects near-black scroll tint (keeps base light)", () => {
    const result = resolveScrollAwareChromeColors({
      resolved: "light",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#fafafa",
      scroll: { light: "#18181b", dark: "#020408", sourceKey: "footer-dark" },
    });
    assert.equal(result.color, "#fafafa");
    assert.equal(result.lightColor, "#fafafa");
    assert.equal(result.darkColor, "#020408");
  });

  it("dark appearance rejects light scroll tint (keeps base dark)", () => {
    const result = resolveScrollAwareChromeColors({
      resolved: "dark",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#020408",
      scroll: { light: "#fafafa", dark: "#f4f4f5", sourceKey: "hero-light" },
    });
    assert.equal(result.color, "#020408");
    assert.equal(result.lightColor, "#fafafa");
    assert.equal(result.darkColor, "#020408");
  });

  it("light appearance keeps mid-tone accent scroll tint", () => {
    const result = resolveScrollAwareChromeColors({
      resolved: "light",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#fafafa",
      scroll: { light: "#c9a227", dark: "#17120a", sourceKey: "footer-accent" },
    });
    assert.equal(result.color, "#c9a227");
    assert.equal(result.lightColor, "#c9a227");
  });
  it("resolveScrollAwareChromeColors keeps forced baseActiveColor when no scroll tint", () => {
    const without = resolveScrollAwareChromeColors({
      resolved: "dark",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#111111",
      scroll: null,
    });
    assert.equal(without.color, "#111111");
    assert.equal(without.lightColor, "#fafafa");
    assert.equal(without.darkColor, "#020408");
  });

  it("theme flip mid-scroll uses the section dark tint (not default projection)", () => {
    setActiveScrollChromeTint({
      light: "#e8f0ee",
      dark: "#1a2740",
      sourceKey: "products",
    });
    const scroll = getActiveScrollChromeTint();
    const light = resolveScrollAwareChromeColors({
      resolved: "light",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#fafafa",
      scroll,
    });
    const dark = resolveScrollAwareChromeColors({
      resolved: "dark",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#020408",
      scroll,
    });
    assert.equal(light.color, "#e8f0ee");
    assert.equal(dark.color, "#1a2740");
    assert.notEqual(dark.color, "#020408");
  });

  it("activeColorFromChromeTintPair respects resolved appearance", () => {
    const pair = { lightColor: "#fff", darkColor: "#000" };
    assert.equal(activeColorFromChromeTintPair(pair, "light"), "#fff");
    assert.equal(activeColorFromChromeTintPair(pair, "dark"), "#000");
  });

  it("pickDominantScrollChromeTarget ignores sub-threshold ratios", () => {
    const a = fakeEl("a", 0);
    const b = fakeEl("b", 1);
    const ratios = new Map<Element, number>([
      [a, 0.1],
      [b, 0.4],
    ]);
    assert.equal(pickDominantScrollChromeTarget(ratios, 0.15), b);
    assert.equal(pickDominantScrollChromeTarget(ratios, 0.5), null);
  });

  it("pinned bottom falls back to last registered section when ratios starve", () => {
    const hero = fakeEl("hero", 0);
    const footer = fakeEl("footer", 1);
    const ratios = new Map<Element, number>([
      [hero, 0],
      [footer, 0.05],
    ]);
    const dominant = resolveDominantScrollChromeTarget(ratios, [hero, footer], {
      minRatio: 0.15,
      pinnedBottom: true,
      pinnedTop: false,
    });
    assert.equal(dominant, footer);
  });

  it("faint footer mid-page does not steal base projection (reported bug)", () => {
    // Hero/default omit tint attrs — only the footer is registered, with a
    // tiny intersection while the user is still mid-page (not pinned).
    const footer = fakeEl("footer", 0);
    const ratios = new Map<Element, number>([[footer, 0.05]]);
    const dominant = resolveDominantScrollChromeTarget(ratios, [footer], {
      minRatio: 0.15,
      pinnedBottom: false,
      pinnedTop: false,
    });
    assert.equal(dominant, null);
    // Caller uses base projection when scroll tint is null.
    const colors = resolveScrollAwareChromeColors({
      resolved: "light",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#fafafa",
      scroll: null,
    });
    assert.equal(colors.color, "#fafafa");
  });

  it("pinned bottom selects footer tint after mid-page projection", () => {
    const footer = fakeEl("footer", 0);
    const ratios = new Map<Element, number>([[footer, 0.05]]);
    const midPage = resolveDominantScrollChromeTarget(ratios, [footer], {
      minRatio: 0.15,
      pinnedBottom: false,
      pinnedTop: false,
    });
    assert.equal(midPage, null);

    const atBottom = resolveDominantScrollChromeTarget(ratios, [footer], {
      minRatio: 0.15,
      pinnedBottom: true,
      pinnedTop: false,
    });
    assert.equal(atBottom, footer);

    const footerTint = {
      light: "#c9a227",
      dark: "#17120a",
      sourceKey: "footer",
    };
    const atBottomColors = resolveScrollAwareChromeColors({
      resolved: "light",
      baseLight: "#fafafa",
      baseDark: "#020408",
      baseActiveColor: "#fafafa",
      scroll: footerTint,
    });
    assert.equal(atBottomColors.color, "#c9a227");
    assert.equal(atBottomColors.lightColor, "#c9a227");
    assert.equal(atBottomColors.darkColor, "#17120a");
  });

  it("sub-minRatio candidate never wins solely because it intersects", () => {
    const hero = fakeEl("hero", 0);
    const footer = fakeEl("footer", 1);
    const ratios = new Map<Element, number>([
      [hero, 0],
      [footer, 0.12],
    ]);
    const dominant = resolveDominantScrollChromeTarget(ratios, [hero, footer], {
      minRatio: 0.15,
      pinnedBottom: false,
      pinnedTop: false,
    });
    assert.equal(dominant, null);
  });

  it("pinned top does not steal a non-intersecting first section (e.g. footer-only tint)", () => {
    const footer = fakeEl("footer", 0);
    const ratios = new Map<Element, number>([[footer, 0]]);
    const dominant = resolveDominantScrollChromeTarget(ratios, [footer], {
      minRatio: 0.15,
      pinnedBottom: false,
      pinnedTop: true,
    });
    assert.equal(dominant, null);
  });

  it("pinned top keeps an intersecting first section", () => {
    const hero = fakeEl("hero", 0);
    const footer = fakeEl("footer", 1);
    const ratios = new Map<Element, number>([
      [hero, 0.08],
      [footer, 0],
    ]);
    const dominant = resolveDominantScrollChromeTarget(ratios, [hero, footer], {
      minRatio: 0.15,
      pinnedBottom: false,
      pinnedTop: true,
    });
    assert.equal(dominant, hero);
  });

  it("pickDocumentExtremeTarget uses document order", () => {
    const a = fakeEl("a", 0);
    const m = fakeEl("m", 1);
    const z = fakeEl("z", 2);
    assert.equal(pickDocumentExtremeTarget([m, z, a], "first"), a);
    assert.equal(pickDocumentExtremeTarget([m, z, a], "last"), z);
  });

  it("scrollChromeTintEquals compares source and colors", () => {
    assert.equal(
      scrollChromeTintEquals(
        { light: "#aaa", dark: "#bbb", sourceKey: "x" },
        { light: "#aaa", dark: "#bbb", sourceKey: "x" },
      ),
      true,
    );
    assert.equal(
      scrollChromeTintEquals(
        { light: "#aaa", dark: "#bbb", sourceKey: "x" },
        { light: "#aaa", dark: "#ccc", sourceKey: "x" },
      ),
      false,
    );
  });

  it("readScrollChromeTintFromElement normalizes hex attrs", () => {
    const attrs: Record<string, string> = {
      [CHROME_TINT_LIGHT_ATTR]: "#E8F0EE",
      [CHROME_TINT_DARK_ATTR]: "#0a0a12",
      id: "hero",
    };
    const el = {
      getAttribute(name: string) {
        return attrs[name] ?? null;
      },
      id: "hero",
      tagName: "SECTION",
    } as unknown as Element;

    const tint = readScrollChromeTintFromElement(el);
    assert.ok(tint);
    assert.equal(tint!.sourceKey, "hero");
    assert.equal(tint!.light, "#e8f0ee");
    assert.equal(tint!.dark, "#0a0a12");
  });
});
