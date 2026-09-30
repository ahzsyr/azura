import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  heroEntranceClass,
  isHeroEntranceEffect,
  parseHeroAnimations,
} from "@/features/builder/blocks/marketing/lib/hero-animations";

describe("hero-animations", () => {
  it("detects entrance effects", () => {
    assert.equal(isHeroEntranceEffect("typewriter"), true);
    assert.equal(isHeroEntranceEffect("neon-glow"), false);
  });

  it("maps heading entrance classes", () => {
    assert.match(heroEntranceClass("fade-up", "heading"), /hero-anim-entrance/);
    assert.match(heroEntranceClass("slide-in", "heading"), /hero-anim-slide-in/);
    assert.match(heroEntranceClass("typewriter", "heading"), /hero-anim-typewriter/);
  });

  it("maps subheading entrance classes", () => {
    assert.match(heroEntranceClass("fade-up", "subheading"), /hero-anim-entrance/);
  });

  it("parses animations config from CMS settings", () => {
    assert.deepEqual(
      parseHeroAnimations({
        headingEffect: "typewriter",
        subheadingEffect: "fade-up",
        staggerDelay: 0.2,
        parallaxSpeed: 0.5,
      }),
      {
        headingEffect: "typewriter",
        subheadingEffect: "fade-up",
        badgeEffect: undefined,
        staggerDelay: 0.2,
        animationDuration: undefined,
        parallaxSpeed: 0.5,
      },
    );
  });
});
