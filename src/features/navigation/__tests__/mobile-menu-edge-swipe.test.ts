import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EDGE_SWIPE_ZONE_PX,
  shouldOpenFromEdge,
  startsInEdgeZone,
} from "@/features/navigation/components/header/MobileMenu/mobile-menu-edge-swipe";
import {
  clearMobileMenuHost,
  isMobileMenuShown,
  mobileMenuEventTargetsHost,
  setMobileMenuShown,
  subscribeMobileMenu,
} from "@/features/navigation/components/header/MobileMenu/mobile-menu-bridge";

describe("mobile menu edge swipe: start zone", () => {
  it("starts at the right edge in LTR, where the drawer lives", () => {
    assert.equal(startsInEdgeZone(390 - 4, 390, false), true);
    assert.equal(startsInEdgeZone(390 - EDGE_SWIPE_ZONE_PX, 390, false), true);
    assert.equal(startsInEdgeZone(390 - EDGE_SWIPE_ZONE_PX - 1, 390, false), false);
    assert.equal(startsInEdgeZone(4, 390, false), false);
  });

  it("starts at the left edge in RTL", () => {
    assert.equal(startsInEdgeZone(4, 390, true), true);
    assert.equal(startsInEdgeZone(390 - 4, 390, true), false);
  });
});

describe("mobile menu edge swipe: release decision", () => {
  it("opens past 40% of the drawer width", () => {
    assert.equal(shouldOpenFromEdge(130, 320, 0), true);
    assert.equal(shouldOpenFromEdge(120, 320, 0), false);
  });

  it("opens on an inward flick even with little travel", () => {
    assert.equal(shouldOpenFromEdge(40, 320, 0.5), true);
  });

  it("cancels on an outward flick even past the threshold", () => {
    assert.equal(shouldOpenFromEdge(200, 320, -0.5), false);
  });

  it("never opens without travel", () => {
    assert.equal(shouldOpenFromEdge(0, 320, 2), false);
  });
});

describe("mobile menu bridge", () => {
  const event = (hostId?: string) => new CustomEvent("x", { detail: { hostId } });

  it("routes addressed events to their host only", () => {
    assert.equal(mobileMenuEventTargetsHost(event("a"), "a", true, "open"), true);
    assert.equal(mobileMenuEventTargetsHost(event("a"), "b", true, "open"), false);
  });

  it("sends unaddressed open requests to the live site menu, never a preview", () => {
    assert.equal(mobileMenuEventTargetsHost(event(), "a", true, "open"), true);
    assert.equal(mobileMenuEventTargetsHost(event(), "a", false, "open"), false);
  });

  it("sends unaddressed close requests to every host", () => {
    assert.equal(mobileMenuEventTargetsHost(event(), "a", false, "close"), true);
  });

  it("publishes shown state to the trigger", () => {
    let calls = 0;
    const unsubscribe = subscribeMobileMenu(() => {
      calls += 1;
    });
    setMobileMenuShown("t", true);
    setMobileMenuShown("t", true);
    assert.equal(isMobileMenuShown("t"), true);
    clearMobileMenuHost("t");
    assert.equal(isMobileMenuShown("t"), false);
    assert.equal(calls, 2);
    unsubscribe();
  });
});
